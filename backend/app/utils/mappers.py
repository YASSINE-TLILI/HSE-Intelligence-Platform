import base64
from datetime import datetime

from app.core.constants import GRAVITE_TO_PRIORITY




def to_time_label(value) -> str:
    """
    Retourne la date au format "dd/MM/yyyy HH:mm" lisible pour l'affichage.
    Le frontend sait parser ce format via parseIncidentDate().
    """
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    if isinstance(value, str):
        return value
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
        "id":       str(row.get("id_incident")),
        "title":    row.get("titre"),
        "zone":     row.get("zone_name") or "Zone inconnue",
        "secteur":  row.get("secteur_name") or "Secteur inconnu",
        "secteurId": row.get("id_secteur"),
        "entiteId": row.get("id_entite"),
        "entite":   row.get("nom_entite") or "Entité inconnue",
        "priority": priority,
        "type_incident": row.get("type_incident"),
        "description": row.get("description"),
        "status":   row.get("statut"),
        "time":     to_time_label(row.get("date_declaration")),
        "reporter": row.get("reporter_name") or "N/A",
        "score":    float(row.get("risk_score") or score_from_priority(priority)),
        "lat":      lat,
        "lng":      lng,
        "photoUrl": normalize_photo_ref(row.get("photo_path")),
    }


def map_user_row(row: dict) -> dict:
    
    date_naissance = row.get("date_naissance")

    return {
        "id":            int(row.get("id") or 0),
        "nom":           row.get("nom")    or "",
        "prenom":        row.get("prenom") or "",
        "email":         row.get("email")  or "",
        "role":          row.get("role")   or "",
        "active":        bool(row.get("active")),
        "telephone":     row.get("telephone"),
        "adresse":       row.get("adresse"),
        "dateNaissance": str(date_naissance) if date_naissance else None,
        "idSite":        row.get("id_site"),
        "idSecteur":     row.get("id_secteur"),
        "idZone":        row.get("id_zone"),
        "idEntite":      row.get("id_entite"),
        "nomSecteur":    row.get("nom_secteur"),
        "nomZone":       row.get("nom_zone"),
        "nomEntite":     row.get("nom_entite"),
    }