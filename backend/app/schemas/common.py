from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TimestampMixin(BaseModel):
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list
