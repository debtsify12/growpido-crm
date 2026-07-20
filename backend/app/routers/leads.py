from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.lead import Lead, LeadStage
from app.models.activity import Activity, ActivityType
from app.models.user import User
from app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadResponse, LeadListResponse, StageChangeRequest
)
from app.schemas.activity import ActivityResponse
from app.core.auth import get_current_user
from app.services.automation import handle_stage_change, handle_lead_assignment

router = APIRouter(prefix="/api/leads", tags=["leads"])


def _get_lead_or_404(lead_id: str, db: Session) -> Lead:
    lead = (
        db.query(Lead)
        .options(
            joinedload(Lead.assigned_user),
            joinedload(Lead.added_by_user)
        )
        .filter(Lead.id == lead_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("", response_model=LeadListResponse)
def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    stage: Optional[str] = None,
    priority: Optional[str] = None,
    source: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    is_lost: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.user import UserRole

    query = db.query(Lead).options(
        joinedload(Lead.assigned_user),
        joinedload(Lead.added_by_user)
    )

    # Role-based filter
    if current_user.role == UserRole.member:
        query = query.filter(Lead.assigned_to == current_user.id)
    elif current_user.role == UserRole.admin:
        query = query.filter(Lead.tenant_id == current_user.tenant_id)


    if stage:
        query = query.filter(Lead.stage == stage)
    if priority:
        query = query.filter(Lead.priority == priority)
    if source:
        query = query.filter(Lead.source == source)
    if assigned_to:
        query = query.filter(Lead.assigned_to == assigned_to)
    if is_lost is not None:
        query = query.filter(Lead.is_lost == is_lost)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            Lead.full_name.ilike(pattern)
            | Lead.email.ilike(pattern)
            | Lead.company_name.ilike(pattern)
            | Lead.phone.ilike(pattern)
        )

    total = query.count()
    leads = (
        query.order_by(Lead.last_activity_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return LeadListResponse(total=total, items=leads)


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = Lead(**payload.model_dump())
    lead.added_by_id = current_user.id
    lead.tenant_id = current_user.tenant_id
    db.add(lead)
    db.flush()

    # Log creation activity
    activity = Activity(
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type=ActivityType.lead_created,
        description=f"Lead '{lead.full_name}' created",
        meta_data={"stage": lead.stage.value if lead.stage else None},
    )
    db.add(activity)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_lead_or_404(lead_id, db)


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: str,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = _get_lead_or_404(lead_id, db)
    old_assignee = lead.assigned_to
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(lead, field, value)

    lead.updated_at = datetime.utcnow()

    # If assignment changed, log it
    if "assigned_to" in update_data and update_data["assigned_to"] != old_assignee:
        handle_lead_assignment(db, lead, update_data["assigned_to"], current_user.id)

    # Log field update activity
    changed_fields = list(update_data.keys())
    if changed_fields:
        activity = Activity(
            lead_id=lead.id,
            user_id=current_user.id,
            activity_type=ActivityType.field_updated,
            description=f"Updated fields: {', '.join(changed_fields)}",
            meta_data={"fields": changed_fields},
        )
        db.add(activity)
        lead.last_activity_at = datetime.utcnow()

    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/stage", response_model=LeadResponse)
def change_stage(
    lead_id: str,
    payload: StageChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = _get_lead_or_404(lead_id, db)
    old_stage = lead.stage

    if old_stage == payload.stage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead is already in this stage",
        )

    handle_stage_change(
        db=db,
        lead=lead,
        new_stage=payload.stage,
        old_stage=old_stage,
        changed_by_user_id=current_user.id,
        note=payload.note,
    )

    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.user import UserRole
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can delete leads")
    lead = _get_lead_or_404(lead_id, db)
    db.delete(lead)
    db.commit()


@router.get("/{lead_id}/activities", response_model=List[ActivityResponse])
def get_lead_activities(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_lead_or_404(lead_id, db)
    activities = (
        db.query(Activity)
        .options(joinedload(Activity.user))
        .filter(Activity.lead_id == lead_id)
        .order_by(Activity.created_at.desc())
        .all()
    )
    return activities


@router.get("/pipeline/summary")
def get_pipeline_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns count and total budget per stage — used by Kanban column headers."""
    from sqlalchemy import func

    results = (
        db.query(
            Lead.stage,
            func.count(Lead.id).label("count"),
            func.coalesce(func.sum(Lead.budget), 0).label("total_value"),
        )
        .filter(Lead.is_lost == False)
        .group_by(Lead.stage)
        .all()
    )
    return [
        {"stage": r.stage.value if r.stage else r.stage, "count": r.count, "total_value": r.total_value}
        for r in results
    ]
