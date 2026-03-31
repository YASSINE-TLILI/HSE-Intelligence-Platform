from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.schemas.ai import AIDescriptionRequest
from app.services.ai_service import AIService

router = APIRouter()
_service = AIService()


@router.post("/analyze-description")
def ai_analyze_description(payload: AIDescriptionRequest, _user=Depends(get_current_user)):
    return _service.analyze_description(payload.description)


@router.post("/analyze-image")
def ai_analyze_image(_user=Depends(get_current_user)):
    return _service.analyze_image()


@router.post("/safety-score")
def ai_safety_score(_user=Depends(get_current_user)):
    return _service.safety_score()