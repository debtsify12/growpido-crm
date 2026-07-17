from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime, date

from app.database import get_db
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.core.auth import get_current_user
from app.services.automation import handle_task_completed

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    is_done: Optional[bool] = None,
    lead_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    due_today: Optional[bool] = None,
    overdue: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.user import UserRole

    query = (
        db.query(Task)
        .options(joinedload(Task.lead), joinedload(Task.assigned_user))
    )

    # Members see only their tasks
    if current_user.role == UserRole.member:
        query = query.filter(Task.assigned_to == current_user.id)

    if is_done is not None:
        query = query.filter(Task.is_done == is_done)
    if lead_id:
        query = query.filter(Task.lead_id == lead_id)
    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)

    now = datetime.utcnow()
    if due_today:
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        query = query.filter(Task.due_date >= today_start, Task.due_date <= today_end)
    if overdue:
        query = query.filter(Task.due_date < now, Task.is_done == False)

    return query.order_by(Task.due_date.asc()).all()


@router.post("", response_model=TaskResponse)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = Task(**payload.model_dump(), is_auto_created=False)
    db.add(task)

    # Log task creation activity if linked to lead
    if payload.lead_id:
        from app.models.activity import Activity, ActivityType
        from app.models.lead import Lead
        lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
        if lead:
            activity = Activity(
                lead_id=payload.lead_id,
                user_id=current_user.id,
                activity_type=ActivityType.task_created,
                description=f"Task created: '{payload.title}'",
                meta_data={"task_title": payload.title},
            )
            db.add(activity)
            lead.last_activity_at = datetime.utcnow()

    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = (
        db.query(Task)
        .options(joinedload(Task.lead), joinedload(Task.assigned_user))
        .filter(Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    was_done = task.is_done

    for field, value in update_data.items():
        setattr(task, field, value)

    # If marking done for the first time
    if not was_done and task.is_done:
        task.completed_at = datetime.utcnow()
        if task.lead_id:
            handle_task_completed(db, task.lead_id, task.title, current_user.id)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}
