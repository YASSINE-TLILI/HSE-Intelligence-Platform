from fastapi import APIRouter, Depends, Response, status
from app.core.deps import get_current_user
from app.services.user_service import UserService
from app.schemas.user import UserCreateRequest, UserUpdateRequest

router = APIRouter()
_service = UserService()


@router.get("")
def list_users(user=Depends(get_current_user)):
    return _service.list_users(user)


@router.get("/stats")
def get_user_stats(user=Depends(get_current_user)):
    """
    Retourne les statistiques des utilisateurs dans le périmètre du user connecté.
    Les KPIs retournés dépendent du rôle :
    - RESPONSABLE_SECTEUR : total, déclarants, resp_zone (zone parente), resp_entite (entité parente)
    - RESPONSABLE_ZONE    : total, déclarants, resp_secteur, resp_entite (entité parente)
    - RESPONSABLE_ENTITE  : total, déclarants, resp_secteur, resp_zone
    - ADMINISTRATEUR      : tout
    """
    return _service.get_scoped_stats(user)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreateRequest, user=Depends(get_current_user)):
    return _service.create_user(payload.dict(), user)


@router.put("/{user_id}")
def update_user(user_id: int, payload: UserUpdateRequest, user=Depends(get_current_user)):
    payload_dict = payload.dict(exclude_unset=True)
    return _service.update_user(user_id, payload_dict, user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, user=Depends(get_current_user)):
    _service.delete_user(user_id, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)