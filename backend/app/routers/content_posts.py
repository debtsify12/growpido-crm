from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.content_post import ContentPost, ContentPillar, ContentStatus
from app.models.lead import Lead
from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter(tags=["Content Operations & Client Delivery"])


# ================= SCHEMAS =================

class ContentPostCreate(BaseModel):
    title: str
    content: Optional[str] = None
    hook: Optional[str] = None
    pillar: Optional[str] = ContentPillar.thought_leadership.value
    status: Optional[str] = ContentStatus.idea.value
    scheduled_date: Optional[datetime] = None
    media_url: Optional[str] = None
    viral_score: Optional[int] = 0


class ContentPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    hook: Optional[str] = None
    pillar: Optional[str] = None
    status: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    published_date: Optional[datetime] = None
    viral_score: Optional[int] = None
    client_feedback: Optional[str] = None
    media_url: Optional[str] = None


class ClientDeliveryUpdate(BaseModel):
    monthly_post_quota: Optional[int] = None
    monthly_calls_quota: Optional[int] = None
    health_score: Optional[int] = None
    brand_vault: Optional[Dict[str, Any]] = None


class PortalFeedbackSubmit(BaseModel):
    action: str  # "approve" or "comment"
    feedback: Optional[str] = None


# ================= PROTECTED ENDPOINTS =================

@router.get("/api/leads/{lead_id}/content-posts")
def get_client_content_posts(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Client lead not found")

    posts = (
        db.query(ContentPost)
        .filter(ContentPost.lead_id == lead_id)
        .order_by(ContentPost.scheduled_date.asc().nullslast(), ContentPost.created_at.desc())
        .all()
    )

    # Compute live quota delivery
    published_count = sum(1 for p in posts if p.status in ["Published", "Scheduled", "Approved"])
    quota = lead.monthly_post_quota or 12

    return {
        "items": posts,
        "total": len(posts),
        "quota": quota,
        "delivered": published_count,
        "progress_percent": min(100, round((published_count / max(1, quota)) * 100)),
        "health_score": lead.health_score or 95,
        "brand_vault": lead.brand_vault or {},
    }


@router.post("/api/leads/{lead_id}/content-posts")
def create_content_post(
    lead_id: str,
    payload: ContentPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Client lead not found")

    post = ContentPost(
        lead_id=lead_id,
        tenant_id=lead.tenant_id,
        title=payload.title,
        content=payload.content,
        hook=payload.hook,
        pillar=payload.pillar or ContentPillar.thought_leadership.value,
        status=payload.status or ContentStatus.idea.value,
        scheduled_date=payload.scheduled_date,
        media_url=payload.media_url,
        viral_score=payload.viral_score or 0,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.patch("/api/leads/{lead_id}/delivery-settings")
def update_client_delivery_settings(
    lead_id: str,
    payload: ClientDeliveryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Client lead not found")

    if payload.monthly_post_quota is not None:
        lead.monthly_post_quota = payload.monthly_post_quota
    if payload.monthly_calls_quota is not None:
        lead.monthly_calls_quota = payload.monthly_calls_quota
    if payload.health_score is not None:
        lead.health_score = payload.health_score
    if payload.brand_vault is not None:
        lead.brand_vault = payload.brand_vault

    db.commit()
    db.refresh(lead)
    return {
        "message": "Delivery settings updated",
        "monthly_post_quota": lead.monthly_post_quota,
        "monthly_calls_quota": lead.monthly_calls_quota,
        "health_score": lead.health_score,
        "brand_vault": lead.brand_vault,
    }


@router.get("/api/content-posts/{post_id}")
def get_single_content_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Content post not found")
    return post


@router.patch("/api/content-posts/{post_id}")
def update_content_post(
    post_id: str,
    payload: ContentPostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Content post not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    # If marked published and no published_date, set now
    if post.status == ContentStatus.published.value and not post.published_date:
        post.published_date = datetime.utcnow()

    db.commit()
    db.refresh(post)
    return post


@router.delete("/api/content-posts/{post_id}")
def delete_content_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Content post not found")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully"}


# ================= PUBLIC CLIENT APPROVAL PORTAL ENDPOINTS =================

@router.get("/api/public/portal/{lead_id}")
def get_public_client_portal(lead_id: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Portal link expired or invalid")

    posts = (
        db.query(ContentPost)
        .filter(ContentPost.lead_id == lead_id)
        .order_by(ContentPost.scheduled_date.asc().nullslast(), ContentPost.created_at.desc())
        .all()
    )

    return {
        "client_name": lead.company_name or lead.full_name,
        "poc_name": lead.poc_name or lead.full_name,
        "email": lead.email,
        "quota": lead.monthly_post_quota or 12,
        "brand_vault": lead.brand_vault or {},
        "posts": posts,
    }


@router.post("/api/public/portal/{lead_id}/posts/{post_id}/review")
def submit_portal_review(
    lead_id: str,
    post_id: str,
    payload: PortalFeedbackSubmit,
    db: Session = Depends(get_db),
):
    post = (
        db.query(ContentPost)
        .filter(ContentPost.id == post_id, ContentPost.lead_id == lead_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found for this client")

    if payload.action == "approve":
        post.status = ContentStatus.approved.value
        post.client_feedback = payload.feedback or "Approved by client via portal"
    else:
        post.status = ContentStatus.review.value
        post.client_feedback = payload.feedback or "Changes requested by client"

    db.commit()
    db.refresh(post)
    return {"message": "Feedback submitted successfully", "post": post}
