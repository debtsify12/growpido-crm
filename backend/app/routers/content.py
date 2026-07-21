from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user
from app.models.user import User
from app.services.content_analyzer import analyze_linkedin_content, ContentAnalysisRequest, ContentAnalysisResponse

router = APIRouter(prefix="/content", tags=["Content Strategist"])

@router.post("/analyze", response_model=ContentAnalysisResponse)
async def analyze_content(
    request: ContentAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes a draft LinkedIn post and returns a score, verdict, and suggestions.
    """
    if not request.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content cannot be empty."
        )
        
    result = analyze_linkedin_content(request.content)
    return result
