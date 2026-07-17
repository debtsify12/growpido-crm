from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.task import TaskType


class TaskCreate(BaseModel):
    lead_id: Optional[str] = None
    assigned_to: Optional[str] = None
    title: str
    description: Optional[str] = None
    task_type: Optional[TaskType] = TaskType.follow_up
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    is_done: Optional[bool] = None


class TaskLeadEmbed(BaseModel):
    id: str
    full_name: str
    company_name: Optional[str]
    stage: str

    class Config:
        from_attributes = True


class TaskAssigneeEmbed(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: str
    lead_id: Optional[str]
    assigned_to: Optional[str]
    title: str
    description: Optional[str]
    task_type: TaskType
    due_date: Optional[datetime]
    is_done: bool
    is_auto_created: bool
    created_at: datetime
    completed_at: Optional[datetime]
    lead: Optional[TaskLeadEmbed]
    assigned_user: Optional[TaskAssigneeEmbed]

    class Config:
        from_attributes = True
