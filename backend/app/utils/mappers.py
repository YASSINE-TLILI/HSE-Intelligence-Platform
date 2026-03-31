import base64
from datetime import datetime

from app.core.constants import GRAVITE_TO_PRIORITY


def db_to_status(status: str | None) -> str:
    if status == "CLOTURE":
        return "Résolu"
    if status in ("VALIDE_SECTEUR", "VALIDE_ZONE", "VALIDE_HSE"):
        return "En cours"
    return "En attente"


def to_time_label(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    return str(value)


def to_lat_lng(localisation_gps: str | None) -> tuple[float, float]:
    if not localisation_gps:
        return 48.8566, 2.3522
    try:
        lat_raw, lng_raw = [part.strip() for part in localisation_gps.split(",", 1)]
        return float(lat_raw), float(lng_raw)
    except Exception:
        return 48.8566, 2.3522


def score_from_priority(priority: str) -> int:
    return {"Basse": 20, "Moyenne": 50, "Haute": 80, "Critique": 95}.get(priority, 50)


def normalize_photo_ref(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip()
    if not v:
        return None
    if v.startswith("data:image/"):
        try:
            _, raw = v.split(",", 1)
            base64.b64decode(raw, validate=True)
        except Exception:
            return None
    if v.startswith("/uploads/"):
        return f"/api{v}"
    return v


def map_incident_row(row: dict) -> dict:
    priority = GRAVITE_TO_PRIORITY.get(row.get("gravite"), "Moyenne")
    lat, lng = to_lat_lng(row.get("localisation_gps"))
    return {
        "id": str(row.get("id_incident")),
        "title": row.get("titre"),
        "zone": row.get("zone_name") or "Zone inconnue",
        "secteur": row.get("secteur_name") or "Secteur inconnu",
        "secteurId": row.get("id_secteur"),
        "entiteId": row.get("id_entite"),
        "entite": row.get("nom_entite") or "Entité inconnue",
        "priority": priority,
        "description": row.get("description"),
        "status": db_to_status(row.get("statut")),
        "time": to_time_label(row.get("date_declaration")),
        "reporter": row.get("reporter_name") or "N/A",
        "score": float(row.get("risk_score") or score_from_priority(priority)),
        "lat": lat,
        "lng": lng,
        "photoUrl": normalize_photo_ref(row.get("photo_path")),
    }