from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from app.database import get_db
from app.models.lead import Lead, LeadStage
from app.models.task import Task
from app.models.user import User
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


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """High-level KPIs for top of dashboard."""
    total_leads = db.query(Lead).count()
    active_leads = db.query(Lead).filter(Lead.is_lost == False, Lead.stage != LeadStage.lost).count()
    won_leads = db.query(Lead).filter(Lead.stage == LeadStage.won).count()
    lost_leads = db.query(Lead).filter(Lead.stage == LeadStage.lost).count()
    total_pipeline_value = db.query(func.coalesce(func.sum(Lead.budget), 0)).filter(
        Lead.is_lost == False
    ).scalar()
    overdue_tasks = db.query(Task).filter(
        Task.is_done == False,
        Task.due_date < datetime.utcnow()
    ).count()

    return {
        "total_leads": total_leads,
        "active_leads": active_leads,
        "won_leads": won_leads,
        "lost_leads": lost_leads,
        "total_pipeline_value": total_pipeline_value,
        "overdue_tasks": overdue_tasks,
    }


@router.get("/pipeline-by-stage")
def get_pipeline_by_stage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Count + total budget per stage, in stage order."""
    results = (
        db.query(
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
    """Lead count by source."""
    results = (
        db.query(Lead.source, func.count(Lead.id).label("count"))
        .group_by(Lead.source)
        .all()
    )
    return [
        {"source": r.source.value if r.source else "Unknown", "count": r.count}
        for r in results
    ]


@router.get("/conversion-rates")
def get_conversion_rates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stage-to-stage conversion percentages."""
    results = (
        db.query(Lead.stage, func.count(Lead.id).label("count"))
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
    """Leads with no activity for N days."""
    threshold = datetime.utcnow() - timedelta(days=days)
    stuck = (
        db.query(Lead)
        .filter(
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
        }
        for l in stuck
    ]


@router.get("/team-performance")
def get_team_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lead count per team member."""
    results = (
        db.query(
            User.id,
            User.name,
            func.count(Lead.id).label("lead_count"),
            func.count(
                Lead.id.op("FILTER")(Lead.stage == LeadStage.won)
            ).label("won_count"),
        )
        .outerjoin(Lead, Lead.assigned_to == User.id)
        .group_by(User.id, User.name)
        .all()
    )
    return [
        {
            "user_id": r.id,
            "name": r.name,
            "lead_count": r.lead_count,
        }
        for r in results
    ]
