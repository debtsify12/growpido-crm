from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from app.models.lead import LeadStage, LeadPriority, LeadSource, FundingStage, RevenueRange


class LeadCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None
    company_industry: Optional[str] = None
    city: Optional[str] = None
    company_funding_stage: Optional[FundingStage] = None
    revenue_range: Optional[RevenueRange] = None
    budget: Optional[int] = None
    service_interested: Optional[List[str]] = []
    reputation_building: Optional[bool] = False
    custom_ai_agent: Optional[bool] = False
    source: Optional[LeadSource] = None
    priority: Optional[LeadPriority] = LeadPriority.warm
    tags: Optional[List[str]] = []
    stage: Optional[LeadStage] = LeadStage.new_lead
    assigned_to: Optional[str] = None


class LeadUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None
    company_industry: Optional[str] = None
    city: Optional[str] = None
    company_funding_stage: Optional[FundingStage] = None
    revenue_range: Optional[RevenueRange] = None
    budget: Optional[int] = None
    service_interested: Optional[List[str]] = None
    reputation_building: Optional[bool] = None
    custom_ai_agent: Optional[bool] = None
    source: Optional[LeadSource] = None
    priority: Optional[LeadPriority] = None
    tags: Optional[List[str]] = None
    assigned_to: Optional[str] = None
    is_lost: Optional[bool] = None
    lost_reason: Optional[str] = None


class StageChangeRequest(BaseModel):
    stage: LeadStage
    note: Optional[str] = None  # optional note attached to this stage change


class AssignedUserEmbed(BaseModel):
    id: str
    name: str
    email: str

    class Config:
        from_attributes = True


class LeadResponse(BaseModel):
    id: str
    full_name: str
    phone: Optional[str]
    email: Optional[str]
    company_name: Optional[str]
    company_industry: Optional[str]
    city: Optional[str]
    company_funding_stage: Optional[FundingStage]
    revenue_range: Optional[RevenueRange]
    budget: Optional[int]
    service_interested: Optional[List[str]]
    reputation_building: bool
    custom_ai_agent: bool
    source: Optional[LeadSource]
    priority: Optional[LeadPriority]
    tags: Optional[List[str]]
    stage: LeadStage
    is_lost: bool
    lost_reason: Optional[str]
    follow_up_count: int
    assigned_to: Optional[str]
    assigned_user: Optional[AssignedUserEmbed]
    created_at: datetime
    updated_at: Optional[datetime]
    last_activity_at: Optional[datetime]
    stage_changed_at: Optional[datetime]

    class Config:
        from_attributes = True


class LeadListResponse(BaseModel):
    total: int
    items: List[LeadResponse]
