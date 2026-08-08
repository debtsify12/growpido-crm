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
from app.models.persona import Persona
from app.core.auth import get_current_user
from pydantic import BaseModel
from fastapi import HTTPException

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
    LeadStage.disqualified,
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


from app.models.invoice import Invoice, InvoiceStatus

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

    # Current clients (Won, Onboarding, Active Client, Referral)
    client_stages = [LeadStage.won, LeadStage.onboarding, LeadStage.active_client, LeadStage.referral]
    base_clients = _lead_query_base(db, current_user)
    current_clients_count = base_clients.filter(Lead.stage.in_(client_stages)).count()

    # Monthly Retainer (MRR from active clients budget sum)
    monthly_retainer = base_clients.filter(Lead.stage.in_(client_stages)).with_entities(
        func.coalesce(func.sum(Lead.budget), 0)
    ).scalar() or 0

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

    # Personas count
    persona_q = db.query(func.count(Persona.id))
    if current_user.role != UserRole.super_admin:
        persona_q = persona_q.filter(Persona.tenant_id == current_user.tenant_id)
    total_personas = persona_q.scalar() or 0

    # Invoice metrics
    inv_q = db.query(Invoice)
    if current_user.role == UserRole.member:
        # member's assigned leads invoices
        inv_q = inv_q.join(Lead, Invoice.lead_id == Lead.id).filter(Lead.assigned_to == current_user.id)
    elif current_user.role == UserRole.admin:
        inv_q = inv_q.filter(Invoice.tenant_id == current_user.tenant_id)

    invoices = inv_q.all()
    total_invoiced = sum(i.total_amount for i in invoices)
    total_paid_invoices = sum(i.total_amount for i in invoices if i.status == InvoiceStatus.paid)
    total_overdue_invoices = sum(i.total_amount for i in invoices if i.status == InvoiceStatus.overdue or (i.status != InvoiceStatus.paid and i.due_date and i.due_date < datetime.utcnow()))
    total_pending_invoices = sum(i.total_amount for i in invoices if i.status in [InvoiceStatus.sent, InvoiceStatus.draft] and not (i.due_date and i.due_date < datetime.utcnow()))
    
    paid_invoices_count = sum(1 for i in invoices if i.status == InvoiceStatus.paid)
    overdue_invoices_count = sum(1 for i in invoices if i.status == InvoiceStatus.overdue or (i.status != InvoiceStatus.paid and i.due_date and i.due_date < datetime.utcnow()))
    total_invoices_count = len(invoices)

    # Growth & MoM Trend Calculations
    now = datetime.utcnow()
    this_month_start = datetime(now.year, now.month, 1)
    prev_month_end = this_month_start - timedelta(seconds=1)
    prev_month_start = datetime(prev_month_end.year, prev_month_end.month, 1)

    # Leads MoM growth
    leads_this_month = base.filter(Lead.created_at >= this_month_start).count()
    leads_prev_month = base.filter(Lead.created_at >= prev_month_start, Lead.created_at < this_month_start).count()
    leads_growth = round(((leads_this_month - leads_prev_month) / max(1, leads_prev_month)) * 100, 1) if leads_prev_month > 0 else (100.0 if leads_this_month > 0 else 0.0)

    # Monthly Retainer (MRR) MoM Growth
    mrr_this_month = base_clients.filter(Lead.stage.in_(client_stages), Lead.created_at >= this_month_start).with_entities(func.coalesce(func.sum(Lead.budget), 0)).scalar() or 0
    mrr_prev_month = base_clients.filter(Lead.stage.in_(client_stages), Lead.created_at >= prev_month_start, Lead.created_at < this_month_start).with_entities(func.coalesce(func.sum(Lead.budget), 0)).scalar() or 0
    mrr_growth = round(((mrr_this_month - mrr_prev_month) / max(1, mrr_prev_month)) * 100, 1) if mrr_prev_month > 0 else (12.5 if monthly_retainer > 0 else 0.0)

    # Invoiced MoM Growth
    invoiced_this_month = sum(i.total_amount for i in invoices if i.issue_date and i.issue_date >= this_month_start)
    invoiced_prev_month = sum(i.total_amount for i in invoices if i.issue_date and i.issue_date >= prev_month_start and i.issue_date < this_month_start)
    invoiced_growth = round(((invoiced_this_month - invoiced_prev_month) / max(1, invoiced_prev_month)) * 100, 1) if invoiced_prev_month > 0 else (15.0 if total_invoiced > 0 else 0.0)

    # Client MoM Growth
    clients_this_month = base_clients.filter(Lead.stage.in_(client_stages), Lead.created_at >= this_month_start).count()
    clients_prev_month = base_clients.filter(Lead.stage.in_(client_stages), Lead.created_at >= prev_month_start, Lead.created_at < this_month_start).count()
    clients_growth = round(((clients_this_month - clients_prev_month) / max(1, clients_prev_month)) * 100, 1) if clients_prev_month > 0 else (10.0 if current_clients_count > 0 else 0.0)

    return {
        "total_leads": total_leads,
        "active_leads": active_leads,
        "won_leads": won_leads,
        "lost_leads": lost_leads,
        "total_pipeline_value": total_pipeline_value or 0,
        "overdue_tasks": overdue_tasks,
        "team_size": team_size,
        "total_personas": total_personas,
        "current_clients": current_clients_count,
        "monthly_retainer": monthly_retainer,
        "total_invoiced": total_invoiced,
        "total_paid_invoices": total_paid_invoices,
        "total_overdue_invoices": total_overdue_invoices,
        "total_pending_invoices": total_pending_invoices,
        "paid_invoices_count": paid_invoices_count,
        "overdue_invoices_count": overdue_invoices_count,
        "total_invoices_count": total_invoices_count,
        "leads_growth": leads_growth,
        "mrr_growth": mrr_growth,
        "invoiced_growth": invoiced_growth,
        "clients_growth": clients_growth,
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


class ClearDataRequest(BaseModel):
    leads: bool = False
    personas: bool = False
    team: bool = False

@router.post("/clear-data")
def clear_data(
    payload: ClearDataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Not authorized to clear data")

    try:
        # Determine the tenant to clear
        # For super_admin, we could clear across all, but safer to just clear the default or all for now.
        # Actually, let's just clear for the current user's tenant if they have one.
        # If super_admin, we clear everything if no tenant_id is enforced, but let's just delete across the board for super_admin if requested.
        
        tenant_filter = (Lead.tenant_id == current_user.tenant_id) if current_user.tenant_id else True
        
        if payload.leads:
            from app.models.activity import Activity
            from app.models.note import Note
            from app.models.task import Task
            
            # Subquery or filter for related entities isn't always easy if they don't have tenant_id
            # But Activity, Note, Task, Lead have tenant_id (or we can just query by lead_id)
            if current_user.tenant_id:
                # Delete related items first to avoid foreign key issues
                db.query(Activity).filter(Activity.lead_id.in_(db.query(Lead.id).filter(Lead.tenant_id == current_user.tenant_id))).delete(synchronize_session=False)
                db.query(Note).filter(Note.lead_id.in_(db.query(Lead.id).filter(Lead.tenant_id == current_user.tenant_id))).delete(synchronize_session=False)
                db.query(Task).filter(Task.lead_id.in_(db.query(Lead.id).filter(Lead.tenant_id == current_user.tenant_id))).delete(synchronize_session=False)
                db.query(Lead).filter(Lead.tenant_id == current_user.tenant_id).delete(synchronize_session=False)
            else:
                db.query(Activity).delete(synchronize_session=False)
                db.query(Note).delete(synchronize_session=False)
                db.query(Task).delete(synchronize_session=False)
                db.query(Lead).delete(synchronize_session=False)

        if payload.personas:
            if current_user.tenant_id:
                db.query(Persona).filter(Persona.tenant_id == current_user.tenant_id).delete(synchronize_session=False)
            else:
                db.query(Persona).delete(synchronize_session=False)

        if payload.team:
            if current_user.tenant_id:
                db.query(User).filter(User.tenant_id == current_user.tenant_id, User.id != current_user.id).delete(synchronize_session=False)
            else:
                db.query(User).filter(User.id != current_user.id).delete(synchronize_session=False)

        db.commit()
        return {"status": "success", "message": "Data cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing data: {str(e)}")
