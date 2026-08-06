import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, Integer, Float,
    JSON, Enum as SAEnum, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class InvoiceStatus(str, enum.Enum):
    draft = "Draft"
    sent = "Sent"
    paid = "Paid"
    overdue = "Overdue"
    cancelled = "Cancelled"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Tenant
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)

    # Client (Lead)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False, index=True)

    # Invoice Identifier
    invoice_number = Column(String, nullable=False, index=True)

    # Status
    status = Column(
        SAEnum(InvoiceStatus),
        default=InvoiceStatus.draft,
        nullable=False,
        index=True,
    )

    # Dates
    issue_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    # Financials
    currency = Column(String, default="INR", nullable=False)
    items = Column(JSON, default=list, nullable=False)
    subtotal = Column(Float, default=0.0, nullable=False)
    tax_rate = Column(Float, default=18.0, nullable=False)  # GST percentage
    tax_amount = Column(Float, default=0.0, nullable=False)
    discount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)

    # Details
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    agency_details = Column(JSON, default=dict, nullable=True)
    client_details = Column(JSON, default=dict, nullable=True)

    # Creator & Audit
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", backref="invoices")
    tenant = relationship("Tenant", backref="invoices")
    created_by = relationship("User", foreign_keys=[created_by_id])
