from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User, UserRole
from app.models.lead import Lead, LeadStage
from app.models.task import Task
from app.models.work_log import WorkLog
from app.schemas.user import UserResponse, UserPublic
from app.schemas.work_log import WorkLogCreate, WorkLogResponse
from app.core.auth import get_current_user, get_admin_user
from pydantic import BaseModel

class ToggleStatusRequest(BaseModel):
    is_active: bool

router = APIRouter(prefix="/api/people", tags=["people"])


def _get_tenant_filter(current_user: User):
    """Return tenant_id for filtering — super_admin can see all."""
    if current_user.role == UserRole.super_admin:
        return None
    return current_user.tenant_id


@router.get("", response_model=List[UserResponse])
def list_people(
    department: Optional[str] = None,
    designation: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all team members — filtered by tenant (super_admin sees all)."""
    query = db.query(User).filter(User.role != UserRole.super_admin)

    tenant_id = _get_tenant_filter(current_user)
    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if department:
        query = query.filter(User.department.ilike(f"%{department}%"))

    if designation:
        query = query.filter(User.designation.ilike(f"%{designation}%"))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            User.name.ilike(pattern)
            | User.email.ilike(pattern)
            | User.department.ilike(pattern)
            | User.designation.ilike(pattern)
            | User.employee_id.ilike(pattern)
        )

    return query.order_by(User.name).all()


@router.get("/departments")
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get distinct departments in the tenant."""
    query = db.query(User.department).filter(
        User.role != UserRole.super_admin,
        User.is_active == True,
        User.department.isnot(None),
    )

    tenant_id = _get_tenant_filter(current_user)
    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)

    rows = query.distinct().all()
    return [r.department for r in rows if r.department]


@router.get("/{user_id}", response_model=UserResponse)
def get_person(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a person's profile. Super admin can see anyone."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Person not found")

    # Access control: super_admin sees all; others only within tenant
    if current_user.role != UserRole.super_admin:
        if user.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return user


@router.get("/{user_id}/stats")
def get_person_stats(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated stats for a team member."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Person not found")

    if current_user.role != UserRole.super_admin:
        if user.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_leads = db.query(func.count(Lead.id)).filter(Lead.assigned_to == user_id).scalar() or 0
    open_leads = db.query(func.count(Lead.id)).filter(
        Lead.assigned_to == user_id, Lead.is_lost == False, Lead.stage != LeadStage.lost
    ).scalar() or 0
    won_leads = db.query(func.count(Lead.id)).filter(
        Lead.assigned_to == user_id, Lead.stage == LeadStage.won
    ).scalar() or 0
    lost_leads = db.query(func.count(Lead.id)).filter(
        Lead.assigned_to == user_id, Lead.stage == LeadStage.lost
    ).scalar() or 0

    total_tasks = db.query(func.count(Task.id)).filter(Task.assigned_to == user_id).scalar() or 0
    completed_tasks = db.query(func.count(Task.id)).filter(
        Task.assigned_to == user_id, Task.is_done == True
    ).scalar() or 0
    overdue_tasks = db.query(func.count(Task.id)).filter(
        Task.assigned_to == user_id,
        Task.is_done == False,
        Task.due_date < now,
    ).scalar() or 0

    work_hours_this_month = db.query(
        func.coalesce(func.sum(WorkLog.hours), 0)
    ).filter(
        WorkLog.user_id == user_id,
        WorkLog.date >= month_start,
    ).scalar() or 0.0

    return {
        "total_leads": total_leads,
        "open_leads": open_leads,
        "won_leads": won_leads,
        "lost_leads": lost_leads,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "work_hours_this_month": float(work_hours_this_month),
    }


@router.get("/{user_id}/leads")
def get_person_leads(
    user_id: str,
    stage: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get leads assigned to this person."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Person not found")

    if current_user.role != UserRole.super_admin:
        if user.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        # Members can only see their own leads
        if current_user.role == UserRole.member and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(Lead).filter(Lead.assigned_to == user_id)
    if stage:
        query = query.filter(Lead.stage == stage)

    leads = query.order_by(Lead.last_activity_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "full_name": l.full_name,
            "company_name": l.company_name,
            "stage": l.stage.value if l.stage else None,
            "priority": l.priority.value if l.priority else None,
            "is_lost": l.is_lost,
            "budget": l.budget,
            "last_activity_at": l.last_activity_at,
            "created_at": l.created_at,
        }
        for l in leads
    ]


@router.get("/{user_id}/tasks")
def get_person_tasks(
    user_id: str,
    is_done: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get tasks assigned to this person."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Person not found")

    if current_user.role != UserRole.super_admin:
        if user.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if current_user.role == UserRole.member and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(Task).filter(Task.assigned_to == user_id)
    if is_done is not None:
        query = query.filter(Task.is_done == is_done)

    tasks = query.order_by(Task.due_date.asc()).limit(limit).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "task_type": t.task_type.value if t.task_type else None,
            "due_date": t.due_date,
            "is_done": t.is_done,
            "lead_id": t.lead_id,
            "created_at": t.created_at,
        }
        for t in tasks
    ]


@router.get("/{user_id}/work-logs", response_model=List[WorkLogResponse])
def get_person_work_logs(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get work logs for a person."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Person not found")

    if current_user.role != UserRole.super_admin:
        if user.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if current_user.role == UserRole.member and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

    logs = (
        db.query(WorkLog)
        .filter(WorkLog.user_id == user_id)
        .order_by(WorkLog.date.desc())
        .limit(limit)
        .all()
    )
    return logs


@router.post("/{user_id}/work-logs", response_model=WorkLogResponse, status_code=201)
def create_work_log(
    user_id: str,
    payload: WorkLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a work log entry for a person."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Person not found")

    # Only self, admins, or super_admin can add work logs
    if current_user.role == UserRole.member and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only log your own work")

    log = WorkLog(
        user_id=user_id,
        tenant_id=user.tenant_id,
        date=payload.date,
        description=payload.description,
        hours=payload.hours,
        category=payload.category,
        lead_id=payload.lead_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{user_id}/work-logs/{log_id}", status_code=204)
def delete_work_log(
    user_id: str,
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(WorkLog).filter(WorkLog.id == log_id, WorkLog.user_id == user_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Work log not found")

    if current_user.role == UserRole.member and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(log)
    db.commit()
