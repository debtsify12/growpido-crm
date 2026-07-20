from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.tenant import TenantPlan


class TenantCreate(BaseModel):
    name: str
    slug: str
    plan: TenantPlan = TenantPlan.starter


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    plan: Optional[TenantPlan] = None
    is_active: Optional[bool] = None


class TenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: TenantPlan
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TenantWithStats(BaseModel):
    id: str
    name: str
    slug: str
    plan: TenantPlan
    is_active: bool
    created_at: datetime
    user_count: int
    lead_count: int

    class Config:
        from_attributes = True
