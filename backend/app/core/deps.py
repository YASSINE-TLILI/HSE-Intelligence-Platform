from typing import Any

from fastapi import Depends, Header, Query

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.repositories.user_repository import UserRepository

_user_repo = UserRepository()


def get_current_user(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    user_id_query: str | None = Query(default=None, alias="userId"),
) -> dict[str, Any]:
    user_id_raw = x_user_id or user_id_query
    if not user_id_raw:
        raise UnauthorizedError()
    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise UnauthorizedError()

    user = _user_repo.find_by_id(user_id)
    if not user:
        raise UnauthorizedError("Utilisateur introuvable.")
    if int(user.get("active") or 0) != 1:
        raise UnauthorizedError("Compte inactif.")
    return user


def require_roles(*roles: str):
    def checker(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if user.get("role") not in roles:
            raise ForbiddenError("Accès refusé pour ce rôle.")
        return user

    return checker