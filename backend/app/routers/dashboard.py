from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.lead import Lead, LeadStage
from app.models.task import Task
from app.models.user import User, UserRole
from app.models.work_log import WorkLog
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

STAGE_ORDER = [
    LeadStage.new_lead,
    LeadStage.discovery_call_booked,
    LeadStage.discovery_done,
    LeadStage.proposal_sent,
    LeadStage.negotiation,
    LeadStage.won,
    LeadStage.onboarding,
    LeadStage.active_client,
    LeadStage.upsell,
    LeadStage.referral,
    LeadStage.lost,
]


def _lead_query_base(db: Session, current_user: User):
    """Base lead query scoped to tenant (super_admin sees all)."""
    q = db.query(Lead)
    if current_user.role == UserRole.super_admin:
        return q
    if current_user.role == UserRole.member:
        return q.filter(Lead.assigned_to == current_user.id)
    # admin — full tenant
    return q.filter(Lead.tenant_id == current_user.tenant_id)


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """High-level KPIs for the dashboard."""
    base = _lead_query_base(db, current_user)

    total_leads = base.count()
    active_leads = base.filter(Lead.is_lost == False, Lead.stage != LeadStage.lost).count()
    won_leads = base.filter(Lead.stage == LeadStage.won).count()
    lost_leads = base.filter(Lead.stage == LeadStage.lost).count()

    # Re-query for budget sum (SQLAlchemy filter stacking)
    base2 = _lead_query_base(db, current_user)
    total_pipeline_value = base2.filter(Lead.is_lost == False).with_entities(
        func.coalesce(func.sum(Lead.budget), 0)
    ).scalar()

    # Tasks overdue
    task_q = db.query(Task).filter(Task.is_done == False, Task.due_date < datetime.utcnow())
    if current_user.role == UserRole.member:
        task_q = task_q.filter(Task.assigned_to == current_user.id)
    elif current_user.role == UserRole.admin:
        task_q = task_q.filter(Task.tenant_id == current_user.tenant_id)
    overdue_tasks = task_q.count()

    # Team size
    team_q = db.query(func.count(User.id)).filter(User.is_active == True, User.role != UserRole.super_admin)
    if current_user.role == UserRole.admin:
        team_q = team_q.filter(User.tenant_id == current_user.tenant_id)
    team_size = team_q.scalar() or 0

    return {
        "total_leads": total_leads,
        "active_leads": active_leads,
        "won_leads": won_leads,
        "lost_leads": lost_leads,
        "total_pipeline_value": total_pipeline_value or 0,
        "overdue_tasks": overdue_tasks,
        "team_size": team_size,
    }


@router.get("/pipeline-by-stage")
def get_pipeline_by_stage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = _lead_query_base(db, current_user)
    results = (
        base.with_entities(
            Lead.stage,
            func.count(Lead.id).label("count"),
            func.coalesce(func.sum(Lead.budget), 0).label("total_value"),
        )
        .group_by(Lead.stage)
        .all()
    )
    result_map = {r.stage: {"count": r.count, "total_value": r.total_value} for r in results}

    return [
        {
            "stage": stage.value,
            "count": result_map.get(stage, {}).get("count", 0),
            "total_value": result_map.get(stage, {}).get("total_value", 0),
        }
        for stage in STAGE_ORDER
    ]


@router.get("/source-breakdown")
def get_source_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = _lead_query_base(db, current_user)
    results = (
        base.with_entities(Lead.source, func.count(Lead.id).label("count"))
        .group_by(Lead.source)
        .all()
    )
    return [
        {"source": r.source.value if hasattr(r.source, "value") else (r.source if r.source else "Unknown"), "count": r.count}
        for r in results
    ]


@router.get("/conversion-rates")
def get_conversion_rates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = _lead_query_base(db, current_user)
    results = (
        base.with_entities(Lead.stage, func.count(Lead.id).label("count"))
        .group_by(Lead.stage)
        .all()
    )
    result_map = {r.stage: r.count for r in results}
    total = sum(result_map.values()) or 1

    return [
        {
            "stage": stage.value,
            "count": result_map.get(stage, 0),
            "pct_of_total": round(result_map.get(stage, 0) / total * 100, 1),
        }
        for stage in STAGE_ORDER
    ]


@router.get("/stuck-leads")
def get_stuck_leads(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    threshold = datetime.utcnow() - timedelta(days=days)
    base = _lead_query_base(db, current_user)
    stuck = (
        base.filter(
            Lead.last_activity_at < threshold,
            Lead.is_lost == False,
            Lead.stage != LeadStage.lost,
        )
        .order_by(Lead.last_activity_at.asc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": l.id,
            "full_name": l.full_name,
            "company_name": l.company_name,
            "stage": l.stage.value,
            "last_activity_at": l.last_activity_at,
            "days_stuck": (datetime.utcnow() - l.last_activity_at).days if l.last_activity_at else 0,
            "assigned_to": l.assigned_to,
        }
        for l in stuck
    ]


@router.get("/team-performance")
def get_team_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Per-team-member breakdown — available to admin and super_admin."""
    user_q = db.query(User).filter(User.is_active == True, User.role != UserRole.super_admin)

    if current_user.role == UserRole.admin:
        user_q = user_q.filter(User.tenant_id == current_user.tenant_id)
    elif current_user.role == UserRole.member:
        user_q = user_q.filter(User.id == current_user.id)

    users = user_q.all()
    now = datetime.utcnow()

    result = []
    for u in users:
        total_leads = db.query(func.count(Lead.id)).filter(Lead.assigned_to == u.id).scalar() or 0
        open_leads = db.query(func.count(Lead.id)).filter(
            Lead.assigned_to == u.id, Lead.is_lost == False, Lead.stage != LeadStage.lost
        ).scalar() or 0
        won_leads = db.query(func.count(Lead.id)).filter(
            Lead.assigned_to == u.id, Lead.stage == LeadStage.won
        ).scalar() or 0
        completed_tasks = db.query(func.count(Task.id)).filter(
            Task.assigned_to == u.id, Task.is_done == True
        ).scalar() or 0
        pending_tasks = db.query(func.count(Task.id)).filter(
            Task.assigned_to == u.id, Task.is_done == False
        ).scalar() or 0
        overdue_tasks = db.query(func.count(Task.id)).filter(
            Task.assigned_to == u.id, Task.is_done == False, Task.due_date < now
        ).scalar() or 0

        result.append({
            "user_id": u.id,
            "name": u.name,
            "email": u.email,
            "department": u.department,
            "designation": u.designation,
            "employee_id": u.employee_id,
            "role": u.role.value,
            "total_leads": total_leads,
            "open_leads": open_leads,
            "won_leads": won_leads,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "overdue_tasks": overdue_tasks,
        })

    return sorted(result, key=lambda x: x["total_leads"], reverse=True)
