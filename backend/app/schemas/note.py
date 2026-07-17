from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NoteCreate(BaseModel):
    content: str


class NoteUpdate(BaseModel):
    content: str


class NoteAuthorEmbed(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class NoteResponse(BaseModel):
    id: str
    lead_id: str
    author_id: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime]
    author: Optional[NoteAuthorEmbed]

    class Config:
        from_attributes = True
