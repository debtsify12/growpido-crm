import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base


class ActivityType(str, enum.Enum):
    stage_change = "stage_change"
    note_added = "note_added"
    task_created = "task_created"
    task_completed = "task_completed"
    call_logged = "call_logged"
    field_updated = "field_updated"
    lead_created = "lead_created"
    lead_assigned = "lead_assigned"
    stuck_alert = "stuck_alert"


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)  # null = system

    activity_type = Column(SAEnum(ActivityType), nullable=False)
    description = Column(Text, nullable=False)
    meta_data = Column(JSON, default=dict)  # e.g. {"from_stage": "New Lead", "to_stage": "Won"}

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    lead = relationship("Lead", back_populates="activities")
    user = relationship("User", back_populates="activities")
