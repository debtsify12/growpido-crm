import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ContentPillar(str, enum.Enum):
    thought_leadership = "Thought Leadership"
    ai_automation = "AI Automation"
    personal_story = "Personal Story"
    case_study = "Case Study"
    contrarian = "Contrarian Take"
    framework = "Actionable Framework"


class ContentStatus(str, enum.Enum):
    idea = "Idea"
    drafting = "Drafting"
    review = "Review"
    approved = "Approved"
    scheduled = "Scheduled"
    published = "Published"


class ContentPost(Base):
    __tablename__ = "content_posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)

    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    hook = Column(Text, nullable=True)
    pillar = Column(String, default=ContentPillar.thought_leadership.value)
    status = Column(String, default=ContentStatus.idea.value, index=True)

    scheduled_date = Column(DateTime, nullable=True, index=True)
    published_date = Column(DateTime, nullable=True)
    viral_score = Column(Integer, default=0)
    client_feedback = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", back_populates="content_posts")
    tenant = relationship("Tenant")
