"""
Invoices Router — Manage and generate client invoices with revenue tracking
"""
import random
from datetime import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc

from app.database import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.models.lead import Lead
from app.models.user import User, UserRole
from app.models.activity import Activity, ActivityType
from app.core.auth import get_current_user


router = APIRouter(prefix="/api/invoices", tags=["invoices"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class InvoiceItemSchema(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    amount: float = 0.0


class InvoiceCreate(BaseModel):
    lead_id: str
    invoice_number: Optional[str] = None
    status: Optional[InvoiceStatus] = InvoiceStatus.draft
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    currency: Optional[str] = "INR"
    items: List[InvoiceItemSchema] = []
    tax_rate: Optional[float] = 18.0
    discount: Optional[float] = 0.0
    notes: Optional[str] = None
    terms: Optional[str] = None
    agency_details: Optional[Dict[str, Any]] = None
    client_details: Optional[Dict[str, Any]] = None


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    invoice_number: Optional[str] = None
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    currency: Optional[str] = None
    items: Optional[List[InvoiceItemSchema]] = None
    tax_rate: Optional[float] = None
    discount: Optional[float] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    agency_details: Optional[Dict[str, Any]] = None
    client_details: Optional[Dict[str, Any]] = None


class InvoiceLeadSummary(BaseModel):
    id: str
    full_name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    budget: Optional[int] = None
    stage: str

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: str
    tenant_id: Optional[str] = None
    lead_id: str
    invoice_number: str
    status: InvoiceStatus
    issue_date: datetime
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    currency: str
    items: List[Dict[str, Any]]
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount: float
    total_amount: float
    notes: Optional[str] = None
    terms: Optional[str] = None
    agency_details: Optional[Dict[str, Any]] = None
    client_details: Optional[Dict[str, Any]] = None
    created_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lead: Optional[InvoiceLeadSummary] = None

    class Config:
        from_attributes = True


class InvoiceSummaryResponse(BaseModel):
    total_invoiced: float
    total_paid: float
    total_outstanding: float
    total_count: int
    paid_count: int
    pending_count: int


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _generate_invoice_number(db: Session, tenant_id: Optional[str]) -> str:
    """Generate sequential or unique invoice number e.g. INV-2026-0001"""
    year = datetime.utcnow().year
    count = db.query(func.count(Invoice.id)).filter(
        Invoice.tenant_id == tenant_id
    ).scalar() or 0
    seq = count + 1
    return f"INV-{year}-{seq:04d}"


def _calc_totals(items: List[Any], tax_rate: float, discount: float):
    subtotal = 0.0
    formatted_items = []
    for item in items:
        if isinstance(item, dict):
            desc = item.get("description", "")
            qty = float(item.get("quantity", 1))
            price = float(item.get("unit_price", 0))
        else:
            desc = item.description
            qty = float(item.quantity)
            price = float(item.unit_price)
        amount = qty * price
        subtotal += amount
        formatted_items.append({
            "description": desc,
            "quantity": qty,
            "unit_price": price,
            "amount": amount,
        })
    
    tax_amt = (subtotal - discount) * (tax_rate / 100.0) if tax_rate > 0 else 0.0
    if tax_amt < 0:
        tax_amt = 0.0
    total = max(0.0, subtotal - discount + tax_amt)
    return subtotal, tax_amt, total, formatted_items


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    lead_id: Optional[str] = None,
    status_filter: Optional[InvoiceStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List invoices with optional filters by client or status."""
    q = db.query(Invoice).options(joinedload(Invoice.lead))
    if current_user.role != UserRole.super_admin:
        q = q.filter(Invoice.tenant_id == current_user.tenant_id)
    
    if lead_id:
        q = q.filter(Invoice.lead_id == lead_id)
    if status_filter:
        q = q.filter(Invoice.status == status_filter)

    return q.order_by(desc(Invoice.created_at)).all()


@router.get("/summary", response_model=InvoiceSummaryResponse)
def get_invoice_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated billing statistics for the dashboard."""
    q = db.query(Invoice)
    if current_user.role != UserRole.super_admin:
        q = q.filter(Invoice.tenant_id == current_user.tenant_id)

    invoices = q.all()

    total_invoiced = sum(inv.total_amount for inv in invoices if inv.status != InvoiceStatus.cancelled)
    total_paid = sum(inv.total_amount for inv in invoices if inv.status == InvoiceStatus.paid)
    total_outstanding = sum(
        inv.total_amount for inv in invoices
        if inv.status in [InvoiceStatus.sent, InvoiceStatus.draft, InvoiceStatus.overdue]
    )

    paid_count = sum(1 for inv in invoices if inv.status == InvoiceStatus.paid)
    pending_count = sum(
        1 for inv in invoices
        if inv.status in [InvoiceStatus.sent, InvoiceStatus.draft, InvoiceStatus.overdue]
    )

    return {
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "total_outstanding": total_outstanding,
        "total_count": len(invoices),
        "paid_count": paid_count,
        "pending_count": pending_count,
    }


@router.get("/client/{lead_id}", response_model=List[InvoiceResponse])
def get_client_invoices(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch all invoices for a particular client."""
    q = db.query(Invoice).options(joinedload(Invoice.lead)).filter(Invoice.lead_id == lead_id)
    if current_user.role != UserRole.super_admin:
        q = q.filter(Invoice.tenant_id == current_user.tenant_id)
    return q.order_by(desc(Invoice.created_at)).all()


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single invoice by ID."""
    q = db.query(Invoice).options(joinedload(Invoice.lead)).filter(Invoice.id == invoice_id)
    if current_user.role != UserRole.super_admin:
        q = q.filter(Invoice.tenant_id == current_user.tenant_id)
    inv = q.first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a new invoice for a client."""
    # Verify lead exists
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Client lead not found")

    tenant_id = lead.tenant_id or current_user.tenant_id
    inv_num = payload.invoice_number or _generate_invoice_number(db, tenant_id)

    tax_rate = payload.tax_rate if payload.tax_rate is not None else 18.0
    discount = payload.discount if payload.discount is not None else 0.0

    subtotal, tax_amt, total, formatted_items = _calc_totals(payload.items, tax_rate, discount)

    # Default agency info if not passed
    agency_details = payload.agency_details or {
        "name": "Growpido Growth & Tech Agency",
        "email": "billing@growpido.com",
        "phone": "+91 98765 43210",
        "address": "DLF Cyber City, Tower B, Gurugram, Haryana 122002",
        "gst": "07AAAAA0000A1Z5",
        "pan": "ABCDE1234F",
        "bank_name": "HDFC Bank",
        "account_number": "50200012345678",
        "ifsc": "HDFC0001234",
        "upi_id": "growpido@okhdfcbank",
    }

    # Default client details if not passed
    client_details = payload.client_details or {
        "name": lead.full_name,
        "company": lead.company_name or lead.full_name,
        "email": lead.email or "",
        "phone": lead.phone or "",
        "address": lead.company_address or lead.city or "",
        "poc": lead.poc_name or lead.full_name,
    }

    invoice = Invoice(
        tenant_id=tenant_id,
        lead_id=payload.lead_id,
        invoice_number=inv_num,
        status=payload.status or InvoiceStatus.draft,
        issue_date=payload.issue_date or datetime.utcnow(),
        due_date=payload.due_date,
        currency=payload.currency or "INR",
        items=formatted_items,
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amt,
        discount=discount,
        total_amount=total,
        notes=payload.notes or "Thank you for choosing Growpido. We appreciate your partnership!",
        terms=payload.terms or "Payment is due within the stipulated due date. Please reference the invoice number when making electronic bank transfer.",
        agency_details=agency_details,
        client_details=client_details,
        created_by_id=current_user.id,
    )

    db.add(invoice)

    # Log activity for this lead
    activity = Activity(
        lead_id=lead.id,
        tenant_id=tenant_id,
        user_id=current_user.id,
        activity_type=ActivityType.note_added,
        description=f"Generated Invoice {inv_num} for ₹{total:,.2f}",
        meta_data={"invoice_id": invoice.id, "invoice_number": inv_num, "amount": total},
    )
    db.add(activity)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: str,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update invoice details, line items, or payment status."""
    q = db.query(Invoice).filter(Invoice.id == invoice_id)
    if current_user.role != UserRole.super_admin:
        q = q.filter(Invoice.tenant_id == current_user.tenant_id)
    invoice = q.first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if payload.invoice_number is not None:
        invoice.invoice_number = payload.invoice_number
    if payload.status is not None:
        invoice.status = payload.status
        if payload.status == InvoiceStatus.paid and not invoice.paid_at:
            invoice.paid_at = datetime.utcnow()
    if payload.issue_date is not None:
        invoice.issue_date = payload.issue_date
    if payload.due_date is not None:
        invoice.due_date = payload.due_date
    if payload.paid_at is not None:
        invoice.paid_at = payload.paid_at
    if payload.currency is not None:
        invoice.currency = payload.currency
    if payload.notes is not None:
        invoice.notes = payload.notes
    if payload.terms is not None:
        invoice.terms = payload.terms
    if payload.agency_details is not None:
        invoice.agency_details = payload.agency_details
    if payload.client_details is not None:
        invoice.client_details = payload.client_details

    # Recalculate totals if items, tax, or discount updated
    items_to_calc = payload.items if payload.items is not None else invoice.items
    tax_rate_to_calc = payload.tax_rate if payload.tax_rate is not None else invoice.tax_rate
    discount_to_calc = payload.discount if payload.discount is not None else invoice.discount

    if payload.items is not None or payload.tax_rate is not None or payload.discount is not None:
        subtotal, tax_amt, total, formatted_items = _calc_totals(items_to_calc, tax_rate_to_calc, discount_to_calc)
        invoice.items = formatted_items
        invoice.subtotal = subtotal
        invoice.tax_rate = tax_rate_to_calc
        invoice.tax_amount = tax_amt
        invoice.discount = discount_to_calc
        invoice.total_amount = total

    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an invoice."""
    q = db.query(Invoice).filter(Invoice.id == invoice_id)
    if current_user.role != UserRole.super_admin:
        q = q.filter(Invoice.tenant_id == current_user.tenant_id)
    invoice = q.first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(invoice)
    db.commit()
