"""
Automation Service
==================
Handles all business logic triggered by lead events:
- Stage-change → auto-create follow-up task + activity log
- Lead assignment → activity log
- Stuck-lead detection (called by scheduler)
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.lead import Lead, LeadStage
from app.models.task import Task, TaskType
from app.models.activity import Activity, ActivityType
from app.core.config import settings


# Maps each stage transition to (task title, task type, due_in_days)
STAGE_TASK_MAP = {
    LeadStage.discovery_call_booked: (
        "Confirm discovery call with lead",
        TaskType.call,
        1,
    ),
    LeadStage.discovery_done: (
        "Prepare and send proposal",
        TaskType.other,
        2,
    ),
    LeadStage.proposal_sent: (
        "Follow up on proposal",
        TaskType.follow_up,
        settings.PROPOSAL_FOLLOWUP_DAYS,
    ),
    LeadStage.negotiation: (
        "Schedule negotiation call",
        TaskType.call,
        settings.NEGOTIATION_FOLLOWUP_DAYS,
    ),
    LeadStage.won: (
        "Kick off onboarding process",
        TaskType.onboarding,
        1,
    ),
    LeadStage.onboarding: (
        "Complete onboarding checklist with client",
        TaskType.onboarding,
        3,
    ),
    LeadStage.active_client: (
        "Check in with active client",
        TaskType.follow_up,
        7,
    ),
    LeadStage.upsell: (
        "Discuss upsell opportunity",
        TaskType.meeting,
        2,
    ),
    LeadStage.referral: (
        "Ask client for referrals",
        TaskType.follow_up,
        3,
    ),
}


def handle_stage_change(
    db: Session,
    lead: Lead,
    new_stage: LeadStage,
    old_stage: LeadStage,
    changed_by_user_id: str,
    note: str = None,
) -> None:
    """
    Called when a lead's stage is updated.
    1. Creates an auto follow-up task (if stage has a task rule)
    2. Logs an activity entry
    3. Optionally attaches a note
    """
    now = datetime.utcnow()

    # 1. Update lead timestamps
    lead.stage = new_stage
    lead.stage_changed_at = now
    lead.last_activity_at = now

    # 2. Create auto task for new stage
    if new_stage in STAGE_TASK_MAP:
        title, task_type, due_days = STAGE_TASK_MAP[new_stage]
        task = Task(
            lead_id=lead.id,
            tenant_id=lead.tenant_id,
            assigned_to=lead.assigned_to or changed_by_user_id,
            title=title,
            task_type=task_type,
            due_date=now + timedelta(days=due_days),
            is_auto_created=True,
        )
        db.add(task)

    # 3. Log activity
    activity = Activity(
        lead_id=lead.id,
        tenant_id=lead.tenant_id,
        user_id=changed_by_user_id,
        activity_type=ActivityType.stage_change,
        description=f"Stage changed from '{old_stage.value}' to '{new_stage.value}'",
        meta_data={"from_stage": old_stage.value, "to_stage": new_stage.value},
    )
    db.add(activity)

    # 4. If note provided, log it too
    if note:
        from app.models.note import Note
        note_obj = Note(
            lead_id=lead.id,
            tenant_id=lead.tenant_id,
            author_id=changed_by_user_id,
            content=note,
        )
        db.add(note_obj)
        note_activity = Activity(
            lead_id=lead.id,
            tenant_id=lead.tenant_id,
            user_id=changed_by_user_id,
            activity_type=ActivityType.note_added,
            description="Note added during stage change",
            meta_data={},
        )
        db.add(note_activity)

    db.commit()
    db.refresh(lead)


def handle_lead_assignment(
    db: Session,
    lead: Lead,
    new_assignee_id: str,
    changed_by_user_id: str,
) -> None:
    """Log activity when a lead is reassigned."""
    activity = Activity(
        lead_id=lead.id,
        tenant_id=lead.tenant_id,
        user_id=changed_by_user_id,
        activity_type=ActivityType.lead_assigned,
        description=f"Lead assigned to user {new_assignee_id}",
        meta_data={"assigned_to": new_assignee_id},
    )
    db.add(activity)
    lead.last_activity_at = datetime.utcnow()
    db.commit()


def handle_task_completed(
    db: Session,
    lead_id: str,
    task_title: str,
    user_id: str,
) -> None:
    """Log activity when a task is marked done."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    tenant_id = lead.tenant_id if lead else None
    
    activity = Activity(
        lead_id=lead_id,
        tenant_id=tenant_id,
        user_id=user_id,
        activity_type=ActivityType.task_completed,
        description=f"Task completed: '{task_title}'",
        meta_data={"task_title": task_title},
    )
    db.add(activity)

    # Update last activity on lead
    if lead:
        lead.last_activity_at = datetime.utcnow()

    db.commit()


def check_and_alert_stuck_leads(db: Session) -> int:
    """
    Scheduler job: find leads with no activity for STUCK_LEAD_DAYS.
    Creates a reminder task for each stuck lead.
    Returns count of leads alerted.
    """
    threshold = datetime.utcnow() - timedelta(days=settings.STUCK_LEAD_DAYS)
    active_stages = [
        LeadStage.new_lead,
        LeadStage.discovery_call_booked,
        LeadStage.discovery_done,
        LeadStage.proposal_sent,
        LeadStage.negotiation,
        LeadStage.onboarding,
        LeadStage.active_client,
        LeadStage.upsell,
    ]

    stuck_leads = (
        db.query(Lead)
        .filter(
            Lead.last_activity_at < threshold,
            Lead.stage.in_(active_stages),
            Lead.is_lost == False,
        )
        .all()
    )

    alerted = 0
    for lead in stuck_leads:
        # Don't create duplicate stuck alerts (check if one already exists in last N days)
        existing_alert = (
            db.query(Activity)
            .filter(
                Activity.lead_id == lead.id,
                Activity.activity_type == ActivityType.stuck_alert,
                Activity.created_at >= threshold,
            )
            .first()
        )
        if existing_alert:
            continue

        task = Task(
            lead_id=lead.id,
            tenant_id=lead.tenant_id,
            assigned_to=lead.assigned_to,
            title=f"⚠️ Stuck Lead Alert: {lead.full_name} — no activity for {settings.STUCK_LEAD_DAYS}+ days",
            task_type=TaskType.follow_up,
            due_date=datetime.utcnow(),
            is_auto_created=True,
        )
        db.add(task)

        alert = Activity(
            lead_id=lead.id,
            tenant_id=lead.tenant_id,
            user_id=None,  # system generated
            activity_type=ActivityType.stuck_alert,
            description=f"No activity for {settings.STUCK_LEAD_DAYS}+ days. Reminder task created.",
            meta_data={"days_stuck": settings.STUCK_LEAD_DAYS},
        )
        db.add(alert)
        alerted += 1

    if alerted > 0:
        db.commit()

    return alerted
