# app/api/v1/incidents.py — UPDATED with advanced stats endpoints
# Add these routes to your existing incidents.py

from fastapi import APIRouter, Depends, Query, Response, status
from typing import Optional

from app.core.deps import get_current_user
from app.schemas.incidents import IncidentCreateRequest, IncidentUpdateRequest
from app.services.incident_service import IncidentService

router = APIRouter()
_service = IncidentService()


@router.get("")
def list_incidents(user=Depends(get_current_user)):
    return _service.list_incidents(user)


@router.get("/stats")
def get_stats(user=Depends(get_current_user)):
    return _service.get_stats(user)


@router.get("/stats/priority-distribution")
def get_priority_distribution(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    """Répartition des incidents par priorité/gravité avec filtre date."""
    return _service.get_priority_distribution(user, date_from=date_from, date_to=date_to)


@router.get("/stats/status-distribution")
def get_status_distribution(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    """Répartition des incidents par statut avec filtre date."""
    return _service.get_status_distribution(user, date_from=date_from, date_to=date_to)


@router.get("/stats/by-scope")
def get_incidents_by_scope(
    days: int = Query(30, ge=1),
    user=Depends(get_current_user),
):
    """
    Incidents groupés par scope:
    - RESPONSABLE_SECTEUR → son secteur
    - RESPONSABLE_ZONE → tous les secteurs de sa zone
    - RESPONSABLE_ENTITE → toutes les zones+secteurs de son entité
    - ADMINISTRATEUR → global par entité/zone
    """
    return _service.get_incidents_by_scope(user, days=days)


@router.get("/stats/closure-rate")
def get_closure_rate(
    days: int = Query(30, ge=1),
    id_entite: Optional[int] = Query(None),
    id_zone: Optional[int] = Query(None),
    user=Depends(get_current_user),
):
    """Taux de clôture des incidents (pour RESPONSABLE_ENTITE et ADMINISTRATEUR)."""
    return _service.get_closure_rate(user, days=days, id_entite=id_entite, id_zone=id_zone)


@router.get("/scope-filters")
def get_scope_filters(user=Depends(get_current_user)):
    return _service.get_scope_filters(user)


@router.get("/reference-data")
def reference_data(_user=Depends(get_current_user)):
    return _service.list_references()


@router.get("/top-declarants")
def get_top_declarants(
    days: int = Query(30, ge=1),
    limit: int = Query(10, ge=1, le=100),
    id_secteur: Optional[int] = Query(None),
    id_zone: Optional[int] = Query(None),
    id_entite: Optional[int] = Query(None),
    user=Depends(get_current_user),
):
    """Top déclarants — scope dynamique selon le rôle + filtres admin."""
    return _service.get_top_declarants_scoped(
        user=user,
        days=days,
        limit=limit,
        id_secteur=id_secteur,
        id_zone=id_zone,
        id_entite=id_entite,
    )


@router.get("/{incident_id}")
def get_incident(incident_id: int, user=Depends(get_current_user)):
    return _service.get_incident(incident_id, user)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_incident(payload: IncidentCreateRequest, user=Depends(get_current_user)):
    return _service.create_incident(payload, user)


@router.put("/{incident_id}")
def update_incident(incident_id: int, payload: IncidentUpdateRequest, user=Depends(get_current_user)):
    return _service.update_incident(incident_id, payload, user)


@router.delete("/{incident_id}")
def delete_incident(incident_id: int, user=Depends(get_current_user)):
    _service.delete_incident(incident_id, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)