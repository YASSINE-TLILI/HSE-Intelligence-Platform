from fastapi import APIRouter

from app.core.database import fetch_one

router = APIRouter()


@router.get("/health")
def health():
    fetch_one("SELECT 1 AS ok")
    return {"ok": True}


@router.get("/")
def api_root():
    return {
        "ok": True,
        "message": "HSE API is running.",
        "endpoints": [
            "/api/health",
            "/api/auth/register-request",
            "/api/auth/login",
            "/api/auth/setup-password",
            "/api/admin/review",
            "/api/incidents",
            "api/users"
        ],
    }