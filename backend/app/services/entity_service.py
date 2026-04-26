from typing import Any, Optional
from fastapi import HTTPException, status

from app.repositories.entity_repository import entity_repository
from app.schemas.entities import (
    EntiteCreate, EntiteUpdate, EntiteResponse, EntiteListResponse,
    ZoneCreate, ZoneUpdate, ZoneResponse, ZoneListResponse,
    SecteurCreate, SecteurUpdate, SecteurResponse, SecteurListResponse,
)


# ──────────────── MAPPERS ────────────────
def _map_entite(row: dict) -> EntiteResponse:
    responsable = None
    if row.get("resp_id"):
        responsable = {
            "id": row["resp_id"],
            "nom": row["resp_nom"],
            "prenom": row["resp_prenom"],
            "email": row["resp_email"],
        }
    return EntiteResponse(
        id_entite=row["id_entite"],
        nom_entite=row["nom_entite"],
        description=row.get("description"),
        id_site=row["id_site"],
        id_responsable_entite=row.get("id_responsable_entite"),
        responsable=responsable,
        nb_zones=row.get("nb_zones", 0),
    )


def _map_zone(row: dict) -> ZoneResponse:
    responsable = None
    if row.get("resp_id"):
        responsable = {
            "id": row["resp_id"],
            "nom": row["resp_nom"],
            "prenom": row["resp_prenom"],
            "email": row["resp_email"],
        }
    return ZoneResponse(
        id_zone=row["id_zone"],
        nom_zone=row["nom_zone"],
        safety_score=row.get("safety_score"),
        id_entite=row["id_entite"],
        id_responsable_zone=row.get("id_responsable_zone"),
        responsable=responsable,
        entite_nom=row.get("entite_nom"),
        nb_secteurs=row.get("nb_secteurs", 0),
    )


def _map_secteur(row: dict) -> SecteurResponse:
    responsable = None
    if row.get("resp_id"):
        responsable = {
            "id": row["resp_id"],
            "nom": row["resp_nom"],
            "prenom": row["resp_prenom"],
            "email": row["resp_email"],
        }
    return SecteurResponse(
        id_secteur=row["id_secteur"],
        nom_secteur=row["nom_secteur"],
        description=row.get("description"),
        id_zone=row["id_zone"],
        id_responsable_secteur=row.get("id_responsable_secteur"),
        responsable=responsable,
        zone_nom=row.get("zone_nom"),
        entite_nom=row.get("entite_nom"),
    )


# ──────────────── HELPERS SCOPE ────────────────

def _get_role_scope(user: dict) -> tuple[str, int | None]:
    role = (user.get("role") or "").upper()
    scope_id = user.get("scope_id")
    return role, scope_id


def _require_can_create_entite(user: dict):
    role, _ = _get_role_scope(user)
    if role not in ("ADMINISTRATEUR",):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un administrateur peut créer une entité.",
        )


def _require_can_create_zone(user: dict):
    role, _ = _get_role_scope(user)
    if role not in ("ADMINISTRATEUR", "RESPONSABLE_ENTITE"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs et responsables d'entité peuvent créer une zone.",
        )


def _require_can_create_secteur(user: dict):
    role, _ = _get_role_scope(user)
    if role not in ("ADMINISTRATEUR", "RESPONSABLE_ENTITE", "RESPONSABLE_ZONE"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs, responsables d'entité et de zone peuvent créer un secteur.",
        )


# ──────────────── SERVICE ────────────────
class EntityService:

    # ─── ENTITES ───
    def list_entites(
        self,
        search: Optional[str] = None,
        id_site: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
        user: Optional[dict] = None,
    ) -> EntiteListResponse:
        """
        Liste les entités selon le rôle :
        - ADMINISTRATEUR : toutes les entités
        - RESPONSABLE_ENTITE : uniquement son entité
        - RESPONSABLE_ZONE : l'entité parente de sa zone
        - RESPONSABLE_SECTEUR : l'entité parente de son secteur
        """
        if user:
            role, scope_id = _get_role_scope(user)

            if role == "RESPONSABLE_ENTITE":
                eid = scope_id or user.get("id_entite")
                if eid:
                    row = entity_repository.get_entite_by_id(int(eid))
                    items = [_map_entite(row)] if row else []
                    return EntiteListResponse(items=items, total=len(items))

            elif role == "RESPONSABLE_ZONE":
                zid = scope_id or user.get("id_zone")
                if zid:
                    zone = entity_repository.get_zone_by_id(int(zid))
                    if zone and zone.get("id_entite"):
                        row = entity_repository.get_entite_by_id(zone["id_entite"])
                        items = [_map_entite(row)] if row else []
                        return EntiteListResponse(items=items, total=len(items))

            elif role == "RESPONSABLE_SECTEUR":
                sid = scope_id or user.get("id_secteur")
                if sid:
                    secteur = entity_repository.get_secteur_by_id(int(sid))
                    if secteur and secteur.get("id_zone"):
                        zone = entity_repository.get_zone_by_id(secteur["id_zone"])
                        if zone and zone.get("id_entite"):
                            row = entity_repository.get_entite_by_id(zone["id_entite"])
                            items = [_map_entite(row)] if row else []
                            return EntiteListResponse(items=items, total=len(items))

        rows, total = entity_repository.get_all_entites(search=search, id_site=id_site, skip=skip, limit=limit)
        return EntiteListResponse(items=[_map_entite(r) for r in rows] if rows else [], total=total or 0)

    def get_entite(self, id_entite: int) -> EntiteResponse:
        row = entity_repository.get_entite_by_id(id_entite)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entité non trouvée")
        return _map_entite(row)

    def create_entite(self, data: EntiteCreate, user: Optional[dict] = None) -> EntiteResponse:
        if user:
            _require_can_create_entite(user)
        row = entity_repository.create_entite(data.model_dump())
        if not row:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur lors de la création")
        return _map_entite(row)

    def update_entite(self, id_entite: int, data: EntiteUpdate) -> EntiteResponse:
        self.get_entite(id_entite)
        row = entity_repository.update_entite(id_entite, data.model_dump(exclude_none=True))
        if not row:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur lors de la mise à jour")
        return _map_entite(row)

    def delete_entite(self, id_entite: int):
        self.get_entite(id_entite)
        deleted = entity_repository.delete_entite(id_entite)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur lors de la suppression")
        return {"message": "Entité supprimée avec succès"}

    # ─── ZONES ───
    def list_zones(
        self,
        search: Optional[str] = None,
        id_entite: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
        user: Optional[dict] = None,
    ) -> ZoneListResponse:
        """
        Liste les zones selon le rôle :
        - ADMINISTRATEUR : toutes
        - RESPONSABLE_ENTITE : zones de son entité (peut filtrer)
        - RESPONSABLE_ZONE : uniquement sa zone (verrouillé)
        - RESPONSABLE_SECTEUR : la zone parente de son secteur
        """
        if user:
            role, scope_id = _get_role_scope(user)

            if role == "RESPONSABLE_ZONE":
                zid = scope_id or user.get("id_zone")
                if zid:
                    row = entity_repository.get_zone_by_id(int(zid))
                    items = [_map_zone(row)] if row else []
                    return ZoneListResponse(items=items, total=len(items))

            elif role == "RESPONSABLE_SECTEUR":
                sid = scope_id or user.get("id_secteur")
                if sid:
                    secteur = entity_repository.get_secteur_by_id(int(sid))
                    if secteur and secteur.get("id_zone"):
                        row = entity_repository.get_zone_by_id(secteur["id_zone"])
                        items = [_map_zone(row)] if row else []
                        return ZoneListResponse(items=items, total=len(items))

            elif role == "RESPONSABLE_ENTITE":
                eid = scope_id or user.get("id_entite")
                # On force le filtre sur son entité, mais on respecte les sous-filtres
                id_entite = int(eid) if eid else id_entite

        rows, total = entity_repository.get_all_zones(search=search, id_entite=id_entite, skip=skip, limit=limit)
        return ZoneListResponse(items=[_map_zone(r) for r in rows] if rows else [], total=total or 0)

    def get_zone(self, id_zone: int) -> ZoneResponse:
        row = entity_repository.get_zone_by_id(id_zone)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone non trouvée")
        return _map_zone(row)

    def create_zone(self, data: ZoneCreate, user: Optional[dict] = None) -> ZoneResponse:
        if user:
            _require_can_create_zone(user)
            # Un RESPONSABLE_ENTITE ne peut créer des zones que dans son entité
            role, scope_id = _get_role_scope(user)
            if role == "RESPONSABLE_ENTITE":
                eid = scope_id or user.get("id_entite")
                if eid and data.id_entite != int(eid):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Vous ne pouvez créer des zones que dans votre entité.",
                    )
        row = entity_repository.create_zone(data.model_dump())
        return _map_zone(row)

    def update_zone(self, id_zone: int, data: ZoneUpdate) -> ZoneResponse:
        self.get_zone(id_zone)
        row = entity_repository.update_zone(id_zone, data.model_dump(exclude_none=True))
        return _map_zone(row)

    def delete_zone(self, id_zone: int):
        self.get_zone(id_zone)
        deleted = entity_repository.delete_zone(id_zone)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur lors de la suppression")
        return {"message": "Zone supprimée avec succès"}

    # ─── SECTEURS ───
    def list_secteurs(
        self,
        search: Optional[str] = None,
        id_zone: Optional[int] = None,
        id_entite: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
        user: Optional[dict] = None,
    ) -> SecteurListResponse:
        """
        Liste les secteurs selon le rôle :
        - ADMINISTRATEUR : tous
        - RESPONSABLE_ENTITE : secteurs de son entité (peut filtrer par zone)
        - RESPONSABLE_ZONE : secteurs de sa zone (peut filtrer)
        - RESPONSABLE_SECTEUR : uniquement son secteur (verrouillé)
        """
        if user:
            role, scope_id = _get_role_scope(user)

            if role == "RESPONSABLE_SECTEUR":
                sid = scope_id or user.get("id_secteur")
                if sid:
                    row = entity_repository.get_secteur_by_id(int(sid))
                    items = [_map_secteur(row)] if row else []
                    return SecteurListResponse(items=items, total=len(items))

            elif role == "RESPONSABLE_ZONE":
                zid = scope_id or user.get("id_zone")
                if zid:
                    id_zone = int(zid)   # force le filtre sur sa zone

            elif role == "RESPONSABLE_ENTITE":
                eid = scope_id or user.get("id_entite")
                if eid:
                    id_entite = int(eid)  # force le filtre sur son entité

        rows, total = entity_repository.get_all_secteurs(
            search=search, id_zone=id_zone, id_entite=id_entite, skip=skip, limit=limit
        )
        return SecteurListResponse(items=[_map_secteur(r) for r in rows] if rows else [], total=total or 0)

    def get_secteur(self, id_secteur: int) -> SecteurResponse:
        row = entity_repository.get_secteur_by_id(id_secteur)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secteur non trouvé")
        return _map_secteur(row)

    def create_secteur(self, data: SecteurCreate, user: Optional[dict] = None) -> SecteurResponse:
        if user:
            _require_can_create_secteur(user)
            role, scope_id = _get_role_scope(user)
            # RESPONSABLE_ZONE ne peut créer des secteurs que dans sa zone
            if role == "RESPONSABLE_ZONE":
                zid = scope_id or user.get("id_zone")
                if zid and data.id_zone != int(zid):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Vous ne pouvez créer des secteurs que dans votre zone.",
                    )
            # RESPONSABLE_ENTITE peut créer dans toute zone de son entité
            if role == "RESPONSABLE_ENTITE":
                eid = scope_id or user.get("id_entite")
                if eid:
                    zone = entity_repository.get_zone_by_id(data.id_zone)
                    if not zone or zone.get("id_entite") != int(eid):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Cette zone n'appartient pas à votre entité.",
                        )
        row = entity_repository.create_secteur(data.model_dump())
        return _map_secteur(row)

    def update_secteur(self, id_secteur: int, data: SecteurUpdate) -> SecteurResponse:
        self.get_secteur(id_secteur)
        row = entity_repository.update_secteur(id_secteur, data.model_dump(exclude_none=True))
        return _map_secteur(row)

    def delete_secteur(self, id_secteur: int):
        self.get_secteur(id_secteur)
        deleted = entity_repository.delete_secteur(id_secteur)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur lors de la suppression")
        return {"message": "Secteur supprimé avec succès"}

    # ─── SELECT HELPERS ───
    def get_users_for_select(self, role: Optional[str] = None):
        return entity_repository.get_users_for_select(role)

    def get_sites_for_select(self):
        return entity_repository.get_sites_for_select()

    # ─── SCOPE META (pour le frontend) ───
    def get_entity_scope(self, user: dict) -> dict:
        """
        Retourne le contexte de scope pour la page Entités :
        quels entités/zones/secteurs sont visibles et lesquels sont verrouillés.
        """
        role, scope_id = _get_role_scope(user)

        result = {
            "role": role,
            "scope_id": scope_id,
            "locked": {"entite": False, "zone": False, "secteur": False},
            "default_entite_id": None,
            "default_zone_id": None,
            "default_secteur_id": None,
            "can_create_entite": role == "ADMINISTRATEUR",
            "can_create_zone": role in ("ADMINISTRATEUR", "RESPONSABLE_ENTITE"),
            "can_create_secteur": role in ("ADMINISTRATEUR", "RESPONSABLE_ENTITE", "RESPONSABLE_ZONE"),
        }

        if role == "RESPONSABLE_ENTITE":
            eid = scope_id or user.get("id_entite")
            result["default_entite_id"] = eid
            result["locked"]["entite"] = True

        elif role == "RESPONSABLE_ZONE":
            zid = scope_id or user.get("id_zone")
            result["default_zone_id"] = zid
            result["locked"]["zone"] = True
            result["locked"]["entite"] = True
            # Récupérer l'entité parente
            if zid:
                zone = entity_repository.get_zone_by_id(int(zid))
                if zone:
                    result["default_entite_id"] = zone.get("id_entite")

        elif role == "RESPONSABLE_SECTEUR":
            sid = scope_id or user.get("id_secteur")
            result["default_secteur_id"] = sid
            result["locked"]["secteur"] = True
            result["locked"]["zone"] = True
            result["locked"]["entite"] = True
            if sid:
                secteur = entity_repository.get_secteur_by_id(int(sid))
                if secteur:
                    result["default_zone_id"] = secteur.get("id_zone")
                    if secteur.get("id_zone"):
                        zone = entity_repository.get_zone_by_id(secteur["id_zone"])
                        if zone:
                            result["default_entite_id"] = zone.get("id_entite")

        return result


# ──────────────── INSTANCE ────────────────
entity_service = EntityService()