from fastapi import APIRouter

from .actions import router as actions_router
from .admin import router as admin_router
from .ai import router as ai_router
from .auth import router as auth_router
from .health import router as health_router
from .incidents import router as incidents_router
from .notifications import router as notifications_router
from .reports import router as reports_router
from .safety import router as safety_router
from .validations import router as validations_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(incidents_router, prefix="/incidents", tags=["incidents"])
api_router.include_router(validations_router, tags=["validations"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(actions_router, tags=["actions"])
api_router.include_router(safety_router, prefix="/safety", tags=["safety"])
api_router.include_router(reports_router, prefix="/reports", tags=["reports"])
api_router.include_router(ai_router, prefix="/ai", tags=["ai"])