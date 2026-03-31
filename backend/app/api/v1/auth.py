from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.schemas.auth import LoginRequest, RegisterRequest, SetupPasswordRequest, UpdateMeRequest
from app.services.auth_service import AuthService

router = APIRouter()
_service = AuthService()


@router.post("/register-request")
def register_request(payload: RegisterRequest):
    return _service.register_request(payload)


@router.post("/setup-password")
def setup_password(payload: SetupPasswordRequest):
    return _service.setup_password(payload)


@router.post("/login")
def login(payload: LoginRequest):
    return _service.login(payload)


@router.post("/logout")
def logout(user=Depends(get_current_user)):
    return _service.logout(None)


@router.get("/me")
def get_me(user=Depends(get_current_user)):
    return _service.get_me(user)


@router.put("/me")
def update_me(payload: UpdateMeRequest, user=Depends(get_current_user)):
    return _service.update_me(user, payload)