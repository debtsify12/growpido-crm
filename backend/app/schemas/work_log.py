from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.work_log import WorkLogCategory


class WorkLogCreate(BaseModel):
    date: datetime
    description: str
    hours: Optional[float] = None
    category: WorkLogCategory = WorkLogCategory.other
    lead_id: Optional[str] = None


class WorkLogUpdate(BaseModel):
    date: Optional[datetime] = None
    description: Optional[str] = None
    hours: Optional[float] = None
    category: Optional[WorkLogCategory] = None
    lead_id: Optional[str] = None


class WorkLogResponse(BaseModel):
    id: str
    user_id: str
    tenant_id: Optional[str] = None
    lead_id: Optional[str] = None
    date: datetime
    description: str
    hours: Optional[float] = None
    category: WorkLogCategory
    created_at: datetime

    class Config:
        from_attributes = True
