from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.schemas.entities import *
from app.services.entity_service import entity_service
from app.core.deps import get_current_user

router = APIRouter(prefix="/entities", tags=["Entities"])


# ─── SCOPE META ───
@router.get("/scope")
def get_entity_scope(user=Depends(get_current_user)):
    """
    Retourne le contexte de scope pour la page Entités :
    permissions de création, champs verrouillés, IDs par défaut.
    """
    return entity_service.get_entity_scope(user)


# ─── ENTITES ───
@router.get("/entites", response_model=EntiteListResponse)
def list_entites(
    search: Optional[str] = None,
    id_site: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user),
):
    return entity_service.list_entites(search=search, id_site=id_site, skip=skip, limit=limit, user=user)


@router.get("/entites/{id_entite}", response_model=EntiteResponse)
def get_entite(id_entite: int):
    return entity_service.get_entite(id_entite)


@router.post("/entites", response_model=EntiteResponse, status_code=201)
def create_entite(data: EntiteCreate, user=Depends(get_current_user)):
    return entity_service.create_entite(data, user=user)


@router.put("/entites/{id_entite}", response_model=EntiteResponse)
def update_entite(id_entite: int, data: EntiteUpdate):
    return entity_service.update_entite(id_entite, data)


@router.delete("/entites/{id_entite}")
def delete_entite(id_entite: int):
    return entity_service.delete_entite(id_entite)


# ─── ZONES ───
@router.get("/zones", response_model=ZoneListResponse)
def list_zones(
    search: Optional[str] = None,
    id_entite: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user),
):
    return entity_service.list_zones(search=search, id_entite=id_entite, skip=skip, limit=limit, user=user)


@router.get("/zones/{id_zone}", response_model=ZoneResponse)
def get_zone(id_zone: int):
    return entity_service.get_zone(id_zone)


@router.post("/zones", response_model=ZoneResponse, status_code=201)
def create_zone(data: ZoneCreate, user=Depends(get_current_user)):
    return entity_service.create_zone(data, user=user)


@router.put("/zones/{id_zone}", response_model=ZoneResponse)
def update_zone(id_zone: int, data: ZoneUpdate):
    return entity_service.update_zone(id_zone, data)


@router.delete("/zones/{id_zone}")
def delete_zone(id_zone: int):
    return entity_service.delete_zone(id_zone)


# ─── SECTEURS ───
@router.get("/secteurs", response_model=SecteurListResponse)
def list_secteurs(
    search: Optional[str] = None,
    id_zone: Optional[int] = None,
    id_entite: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user),
):
    return entity_service.list_secteurs(
        search=search, id_zone=id_zone, id_entite=id_entite, skip=skip, limit=limit, user=user
    )


@router.get("/secteurs/{id_secteur}", response_model=SecteurResponse)
def get_secteur(id_secteur: int):
    return entity_service.get_secteur(id_secteur)


@router.post("/secteurs", response_model=SecteurResponse, status_code=201)
def create_secteur(data: SecteurCreate, user=Depends(get_current_user)):
    return entity_service.create_secteur(data, user=user)


@router.put("/secteurs/{id_secteur}", response_model=SecteurResponse)
def update_secteur(id_secteur: int, data: SecteurUpdate):
    return entity_service.update_secteur(id_secteur, data)


@router.delete("/secteurs/{id_secteur}")
def delete_secteur(id_secteur: int):
    return entity_service.delete_secteur(id_secteur)


# ─── SELECT HELPERS ───
@router.get("/users-select")
def get_users_select(role: Optional[str] = None):
    return entity_service.get_users_for_select(role)


@router.get("/sites-select")
def get_sites_select():
    return entity_service.get_sites_for_select()