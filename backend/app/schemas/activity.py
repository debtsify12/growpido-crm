from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime
from app.models.activity import ActivityType


class ActivityUserEmbed(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class ActivityResponse(BaseModel):
    id: str
    lead_id: str
    user_id: Optional[str]
    activity_type: ActivityType
    description: str
    meta_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    user: Optional[ActivityUserEmbed]

    class Config:
        from_attributes = True
