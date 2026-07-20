import io
import csv
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.lead import Lead, LeadStage, LeadSource, LeadPriority
from app.models.activity import Activity, ActivityType
from app.models.user import User
from app.core.auth import get_current_user, get_admin_user

router = APIRouter(prefix="/api", tags=["import-export"])


@router.post("/import/csv")
async def import_leads_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Import leads from a CSV file.
    Expected columns: full_name, phone, email, company_name, company_industry,
                      city, budget, source, priority, stage, tags, linkedin_url, company_address, poc_name, general_notes
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")

    content = await file.read()
    decoded = content.decode("utf-8-sig")  # handle BOM from Excel
    reader = csv.DictReader(io.StringIO(decoded))

    created = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            # Normalize and clean each row
            full_name = row.get("full_name", "").strip()
            if not full_name:
                errors.append(f"Row {i}: full_name is required")
                continue

            # Safely map enums
            stage_val = row.get("stage", "").strip()
            stage = next(
                (s for s in LeadStage if s.value.lower() == stage_val.lower()),
                LeadStage.new_lead,
            )
            source_val = row.get("source", "").strip()
            source = next(
                (s for s in LeadSource if s.value.lower() == source_val.lower()),
                None,
            )
            priority_val = row.get("priority", "").strip()
            priority = next(
                (p for p in LeadPriority if p.value.lower() == priority_val.lower()),
                LeadPriority.warm,
            )
            budget_str = row.get("budget", "").strip().replace(",", "").replace("₹", "")
            budget = int(budget_str) if budget_str.isdigit() else None

            tags_str = row.get("tags", "").strip()
            tags = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else []

            lead = Lead(
                full_name=full_name,
                phone=row.get("phone", "").strip() or None,
                email=row.get("email", "").strip() or None,
                company_name=row.get("company_name", "").strip() or None,
                company_industry=row.get("company_industry", "").strip() or None,
                city=row.get("city", "").strip() or None,
                budget=budget,
                source=source,
                priority=priority,
                stage=stage,
                tags=tags,
                linkedin_url=row.get("linkedin_url", "").strip() or None,
                company_address=row.get("company_address", "").strip() or None,
                poc_name=row.get("poc_name", "").strip() or None,
                general_notes=row.get("general_notes", "").strip() or None,
                tenant_id=current_user.tenant_id,
                added_by_id=current_user.id,
            )
            db.add(lead)
            db.flush()

            activity = Activity(
                lead_id=lead.id,
                user_id=current_user.id,
                activity_type=ActivityType.lead_created,
                description="Lead imported from CSV",
                meta_data={"imported": True},
            )
            db.add(activity)
            created += 1

        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    db.commit()

    return {
        "created": created,
        "errors": errors,
        "message": f"Successfully imported {created} leads" + (f" with {len(errors)} errors" if errors else ""),
    }


@router.get("/export/csv")
def export_leads_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all leads to CSV."""
    leads = db.query(Lead).all()

    output = io.StringIO()
    fieldnames = [
        "full_name", "phone", "email", "company_name", "company_industry",
        "city", "stage", "priority", "source", "budget", "tags",
        "linkedin_url", "company_address", "poc_name", "general_notes",
        "reputation_building", "custom_ai_agent", "is_lost", "lost_reason",
        "created_at", "last_activity_at",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for lead in leads:
        writer.writerow({
            "full_name": lead.full_name,
            "phone": lead.phone or "",
            "email": lead.email or "",
            "company_name": lead.company_name or "",
            "company_industry": lead.company_industry or "",
            "city": lead.city or "",
            "stage": lead.stage.value if lead.stage else "",
            "priority": lead.priority.value if lead.priority else "",
            "source": lead.source.value if lead.source else "",
            "budget": lead.budget or "",
            "tags": ", ".join(lead.tags) if lead.tags else "",
            "linkedin_url": lead.linkedin_url or "",
            "company_address": lead.company_address or "",
            "poc_name": lead.poc_name or "",
            "general_notes": lead.general_notes or "",
            "reputation_building": lead.reputation_building,
            "custom_ai_agent": lead.custom_ai_agent,
            "is_lost": lead.is_lost,
            "lost_reason": lead.lost_reason or "",
            "created_at": lead.created_at.isoformat() if lead.created_at else "",
            "last_activity_at": lead.last_activity_at.isoformat() if lead.last_activity_at else "",
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=growpido_leads.csv"},
    )
