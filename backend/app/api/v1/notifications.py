# app/api/v1/notifications.py

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.database import fetch_one
from app.core.deps import get_current_user
from app.repositories.notification_repository import NotificationRepository

router = APIRouter()
_repo = NotificationRepository()


def _frontend_url() -> str:
    """
    URL du frontend React.
    Lit settings.ngrok_url (attribut Python minuscule).
    FIX Bug2: utilise settings.ngrok_url et non getattr(settings, "NGROK_URL").
    FIX Bug1: strip() supprime les espaces parasites du .env.
    """
    raw = (settings.ngrok_url or "").strip().rstrip("/")
    if raw and raw != "http://localhost:5173":
        return raw
    # Fallback : app_url si ngrok_url n'est pas configuré
    return (settings.app_url or "http://localhost:5173").strip().rstrip("/")


def _backend_url() -> str:
    """
    URL du backend FastAPI (port 4002 par défaut).
    Utilisée pour construire le lien /open/{id} dans les emails.
    FIX Bug3: le lien email doit pointer vers le BACKEND (port 4002),
    pas vers le frontend (port 5173), car c'est le backend qui marque
    la notification comme lue et fait la redirection.
    """
    # On reconstruit l'URL backend depuis ngrok_url en remplaçant le port
    # si ngrok est configuré, ngrok expose les deux ports → utiliser le même domaine
    ngrok = (settings.ngrok_url or "").strip().rstrip("/")
    if ngrok and not ngrok.startswith("http://localhost"):
        # En production ngrok : le backend est exposé via /api sur le même domaine ngrok
        # On suppose que ngrok pointe vers le frontend (5173) et que le backend
        # est accessible via VITE_API_URL ou directement.
        # La solution la plus simple : le lien email va directement au frontend
        # qui gère lui-même le marquage comme lu via son API.
        # → On retourne le frontend URL (le frontend appelle /api/notifications/{id}/read)
        return ngrok
    return f"http://127.0.0.1:{settings.api_port}"


# ─── Scope filter ─────────────────────────────────────────────────────────────

def _build_notif_scope(user: dict) -> tuple[str, tuple]:
    """Filtre les notifications selon le rôle et le périmètre."""
    role     = (user.get("role") or "").upper()
    user_id  = int(user.get("id") or 0)
    scope_id = user.get("scope_id")

    if role == "ADMINISTRATEUR":
        return "1=1", ()

    if role == "DECLARANT":
        return "n.id_destinataire = %s", (user_id,)

    if role == "RESPONSABLE_SECTEUR":
        sid = scope_id or user.get("id_secteur")
        if sid:
            return (
                "(n.id_destinataire = %s OR n.id_incident IN "
                "(SELECT id_incident FROM incident WHERE id_secteur = %s))",
                (user_id, int(sid)),
            )
        return "n.id_destinataire = %s", (user_id,)

    if role == "RESPONSABLE_ZONE":
        zid = scope_id or user.get("id_zone")
        if zid:
            return (
                "(n.id_destinataire = %s OR n.id_incident IN "
                "(SELECT i.id_incident FROM incident i "
                " INNER JOIN secteur s ON s.id_secteur = i.id_secteur "
                " WHERE s.id_zone = %s))",
                (user_id, int(zid)),
            )
        return "n.id_destinataire = %s", (user_id,)

    if role == "RESPONSABLE_ENTITE":
        eid = scope_id or user.get("id_entite")
        if eid:
            return (
                "(n.id_destinataire = %s OR n.id_incident IN "
                "(SELECT i.id_incident FROM incident i "
                " INNER JOIN secteur s ON s.id_secteur = i.id_secteur "
                " INNER JOIN zone z ON z.id_zone = s.id_zone "
                " WHERE z.id_entite = %s))",
                (user_id, int(eid)),
            )
        return "n.id_destinataire = %s", (user_id,)

    return "n.id_destinataire = %s", (user_id,)


def _serialize(rows: list[dict]) -> list[dict]:
    result = []
    for row in rows:
        r = dict(row)
        for k, v in r.items():
            if hasattr(v, "isoformat"):
                r[k] = v.isoformat()
        result.append(r)
    return result


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/")
def get_notifications(user=Depends(get_current_user)):
    where_sql, params = _build_notif_scope(user)
    return _serialize(_repo.find_in_scope(where_sql, params))


@router.get("/me")
def get_my_notifications(user=Depends(get_current_user)):
    return _serialize(_repo.find_by_user(int(user["id"])))


@router.get("/unread-count")
def unread_count(user=Depends(get_current_user)):
    return {"count": _repo.count_unread(int(user["id"]))}


@router.post("/{notif_id}/read")
def mark_read_post(notif_id: int, user=Depends(get_current_user)):
    _repo.mark_read(notif_id, int(user["id"]))
    return {"message": "OK"}


@router.patch("/{notif_id}/read")
def mark_read_patch(notif_id: int, user=Depends(get_current_user)):
    _repo.mark_read(notif_id, int(user["id"]))
    return {"message": "OK"}


@router.post("/read-all")
def mark_all_read_post(user=Depends(get_current_user)):
    _repo.mark_all_read(int(user["id"]))
    return {"message": "OK"}


@router.patch("/read-all")
def mark_all_read_patch(user=Depends(get_current_user)):
    _repo.mark_all_read(int(user["id"]))
    return {"message": "OK"}


@router.get("/open/{notif_id}")
def open_notification(notif_id: int):
    """
    Lien cliquable depuis l'email (ROUTE PUBLIQUE — sans authentification).

    Workflow :
    1. Marque la notification comme lue en base
    2. Récupère l'id_incident associé
    3. Redirige vers la page détail incident du frontend via ngrok

    FIX Bug3 : ce lien est dans l'email → accessible depuis n'importe quelle
    machine → doit pointer vers l'URL ngrok publique, pas localhost.
    Le backend est exposé via ngrok (même domaine que le frontend ou port 4002).
    """
    # Marquer comme lu (sans vérification utilisateur — lien email public)
    _repo.mark_as_read(notif_id)

    # Trouver l'incident associé
    row = fetch_one(
        "SELECT id_incident FROM notification WHERE id_notification = %s",
        (notif_id,),
    )
    incident_id = (row or {}).get("id_incident")

    # Rediriger vers le frontend (ngrok)
    base = _frontend_url()
    redirect_url = f"{base}/incidents/{incident_id}" if incident_id else f"{base}/notifications"

    return RedirectResponse(url=redirect_url, status_code=302)