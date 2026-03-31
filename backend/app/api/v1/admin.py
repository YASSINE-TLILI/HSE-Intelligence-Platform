from fastapi import APIRouter, Query

from app.schemas.auth import AdminReviewDecisionRequest
from app.services.auth_service import AuthService

router = APIRouter()
_service = AuthService()


@router.get("/review")
def get_review(token: str = Query(...)):
    return _service.get_admin_review(token)


@router.post("/review")
def review(payload: AdminReviewDecisionRequest):
    return _service.admin_review_decision(payload)