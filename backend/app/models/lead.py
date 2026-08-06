import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Integer,
    JSON, Enum as SAEnum, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class LeadStage(str, enum.Enum):
    new_lead = "New Lead"
    discovery_call_booked = "Discovery Call Booked"
    discovery_done = "Discovery Done"
    proposal_sent = "Proposal Sent"
    negotiation = "Negotiation"
    won = "Won"
    onboarding = "Onboarding"
    active_client = "Active Client"
    upsell = "Upsell"
    referral = "Referral"
    lost = "Lost"


class LeadPriority(str, enum.Enum):
    hot = "Hot"
    warm = "Warm"
    cold = "Cold"


class LeadSource(str, enum.Enum):
    linkedin = "LinkedIn"
    website = "Website / Inbound"
    referral = "Referral"
    cold_email = "Cold Outreach (Email)"
    cold_whatsapp = "Cold Outreach (WhatsApp)"
    instagram = "Instagram"
    event = "Event / Conference"
    other = "Other"


class FundingStage(str, enum.Enum):
    bootstrapped = "Bootstrapped"
    angel = "Angel"
    seed = "Seed"
    series_a = "Series A"
    series_b_plus = "Series B+"


class RevenueRange(str, enum.Enum):
    below_10l = "< 10L"
    ten_to_50l = "10L–50L"
    fifty_to_1cr = "50L–1Cr"
    above_1cr = "1Cr+"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Tenant
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)

    # Basic Info
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, index=True, nullable=True)
    company_name = Column(String, nullable=True)
    company_industry = Column(String, nullable=True)
    city = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    company_address = Column(String, nullable=True)
    poc_name = Column(String, nullable=True)

    # Company Details
    company_funding_stage = Column(SAEnum(FundingStage), nullable=True)
    revenue_range = Column(SAEnum(RevenueRange), nullable=True)
    budget = Column(Integer, nullable=True)  # in INR

    # Services
    service_interested = Column(JSON, default=list)
    reputation_building = Column(Boolean, default=False)
    custom_ai_agent = Column(Boolean, default=False)

    # Lead Metadata
    source = Column(SAEnum(LeadSource), nullable=True)
    priority = Column(SAEnum(LeadPriority), default=LeadPriority.warm)
    tags = Column(JSON, default=list)

    # Pipeline Stage
    stage = Column(
        SAEnum(LeadStage),
        default=LeadStage.new_lead,
        nullable=False,
        index=True,
    )
    is_lost = Column(Boolean, default=False)
    lost_reason = Column(Text, nullable=True)
    follow_up_count = Column(Integer, default=0)

    # Assignment & Next Steps
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    added_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    next_step = Column(String, nullable=True)
    next_step_date = Column(DateTime, nullable=True)
    general_notes = Column(Text, nullable=True)

    # Client Delivery & Retainer Specifications
    monthly_post_quota = Column(Integer, default=12)
    monthly_calls_quota = Column(Integer, default=2)
    health_score = Column(Integer, default=95)
    brand_vault = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    stage_changed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="leads")
    assigned_user = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_leads")
    added_by_user = relationship("User", foreign_keys=[added_by_id])
    tasks = relationship("Task", back_populates="lead", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="lead", cascade="all, delete-orphan")
    activities = relationship(
        "Activity",
        back_populates="lead",
        cascade="all, delete-orphan",
        order_by="Activity.created_at.desc()",
    )
    content_posts = relationship(
        "ContentPost",
        back_populates="lead",
        cascade="all, delete-orphan",
        order_by="ContentPost.created_at.desc()",
    )
