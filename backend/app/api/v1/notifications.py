from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.core.exceptions import NotFoundError
from app.services.notification_service import NotificationService

router = APIRouter()
_service = NotificationService()


@router.get("/me")
def my_notifications(user=Depends(get_current_user)):
    return _service.get_for_user(int(user["id"]))


@router.patch("/{notification_id}/read")
def mark_read(notification_id: int, user=Depends(get_current_user)):
    affected = _service.mark_read(notification_id, int(user["id"]))
    if not affected:
        raise NotFoundError("Notification introuvable.")
    return {"message": "Notification marquée comme lue."}


@router.patch("/read-all")
def mark_read_all(user=Depends(get_current_user)):
    _service.mark_all_read(int(user["id"]))
    return {"message": "Toutes les notifications sont marquées comme lues."}