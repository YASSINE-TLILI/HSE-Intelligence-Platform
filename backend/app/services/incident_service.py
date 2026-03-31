from app.core.constants import PRIORITY_TO_GRAVITE, STATUS_TO_DB
from app.core.config import settings
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.repositories.incident_repository import IncidentRepository
from app.schemas.incidents import IncidentCreateRequest, IncidentUpdateRequest
from app.utils.file_utils import cleanup_upload_file, save_data_url_to_file
from app.utils.mappers import map_incident_row, score_from_priority

_repo = IncidentRepository()


class IncidentService:

    def _build_scope_filter(self, user: dict) -> tuple[str, tuple]:
        """Construit le filtre SQL selon le rôle de l'utilisateur."""
        role = (user.get("role") or "").upper()
        user_id = int(user.get("id") or 0)
        user_site_id = user.get("id_site")

        if role == "ADMINISTRATEUR":
            return "1=1", ()
        if role == "DECLARANT":
            return "i.id_declarant = %s", (user_id,)

        # Pour les responsables : filtrer par périmètre assigné, sinon par site
        if role == "RESPONSABLE_SECTEUR":
            if _repo.count_secteurs_of_responsable(user_id) > 0:
                return (
                    "i.id_secteur IN (SELECT s.id_secteur FROM secteur s WHERE s.id_responsable_secteur = %s)",
                    (user_id,),
                )
        if role == "RESPONSABLE_ZONE":
            if _repo.count_zones_of_responsable(user_id) > 0:
                return (
                    "i.id_secteur IN (SELECT s.id_secteur FROM secteur s INNER JOIN zone z ON z.id_zone = s.id_zone WHERE z.id_responsable_zone = %s)",
                    (user_id,),
                )
        if role == "RESPONSABLE_HSE":
            if _repo.count_entites_of_responsable(user_id) > 0:
                return (
                    "i.id_secteur IN (SELECT s.id_secteur FROM secteur s INNER JOIN zone z ON z.id_zone = s.id_zone INNER JOIN entite e ON e.id_entite = z.id_entite WHERE e.id_responsable_hse = %s)",
                    (user_id,),
                )

        # Fallback : périmètre du site
        if user_site_id is not None:
            return (
                "i.id_secteur IN (SELECT s.id_secteur FROM secteur s INNER JOIN zone z ON z.id_zone = s.id_zone INNER JOIN entite e ON e.id_entite = z.id_entite WHERE e.id_site = %s)",
                (int(user_site_id),),
            )
        return "1=1", ()

    def ensure_in_scope(self, user: dict, incident_id: int) -> None:
        where_sql, params = self._build_scope_filter(user)
        row = _repo.find_in_scope_by_id(incident_id, where_sql, params)
        if not row:
            raise ForbiddenError("Accès refusé: incident hors de votre périmètre.")

    def _resolve_sector_and_entity(
        self, secteur_id: int | None, zone_name: str | None, entite_id: int | None
    ) -> tuple[int, int]:
        if secteur_id is None and zone_name:
            row = _repo.find_secteur_by_nom(zone_name)
            secteur_id = int(row["id_secteur"]) if row else None
        if secteur_id is None:
            raise ValidationError("Secteur obligatoire.")

        secteur_row = _repo.find_secteur_with_zone(secteur_id)
        if not secteur_row:
            raise ValidationError("Secteur invalide.")

        entite_from_sector = int(secteur_row["id_entite"])
        resolved_entite = int(entite_id) if entite_id is not None else entite_from_sector
        if resolved_entite != entite_from_sector:
            raise ValidationError("Le secteur sélectionné n'appartient pas à l'entité choisie.")
        return int(secteur_row["id_secteur"]), resolved_entite

    def list_incidents(self, user: dict) -> list[dict]:
        where_sql, where_params = self._build_scope_filter(user)
        rows = _repo.find_all_in_scope(where_sql, where_params)
        return [map_incident_row(row) for row in rows]

    def list_references(self) -> dict:
        rows = _repo.find_references()
        entities: dict[int, dict] = {}
        for row in rows:
            entite_id = int(row["id_entite"])
            if entite_id not in entities:
                entities[entite_id] = {"id": entite_id, "name": row["nom_entite"], "zones": []}
            if row.get("id_zone") is None:
                continue
            zone_id = int(row["id_zone"])
            zone = next((z for z in entities[entite_id]["zones"] if z["id"] == zone_id), None)
            if zone is None:
                zone = {"id": zone_id, "name": row["nom_zone"], "secteurs": []}
                entities[entite_id]["zones"].append(zone)
            if row.get("id_secteur") is not None:
                zone["secteurs"].append({"id": int(row["id_secteur"]), "name": row["nom_secteur"]})
        return {"entities": list(entities.values())}

    def create_incident(self, payload: IncidentCreateRequest, user: dict) -> dict:
        if (user.get("role") or "").upper() != "DECLARANT":
            raise ForbiddenError("Seul un déclarant peut créer un incident.")

        gravite = PRIORITY_TO_GRAVITE.get(payload.priority)
        if not gravite:
            raise ValidationError("priority invalide.")

        secteur_id, entite_id = self._resolve_sector_and_entity(
            payload.secteurId, payload.zone, payload.entiteId
        )
        score = score_from_priority(payload.priority)
        localisation = f"{payload.lat if payload.lat is not None else 48.8566},{payload.lng if payload.lng is not None else 2.3522}"

        incident_id = _repo.create(
            titre=payload.title,
            description=payload.description,
            gravite=gravite,
            risk_score=score,
            localisation_gps=localisation,
            declarant_id=int(user["id"]),
            secteur_id=secteur_id,
            entite_id=entite_id,
        )

        if payload.photoUrl:
            photo_ref = save_data_url_to_file(payload.photoUrl)
            _repo.insert_photo(incident_id, photo_ref, "Uploaded from web app")

        row = _repo.find_by_id(incident_id)
        return map_incident_row(row)

    def update_incident(self, incident_id: int, payload: IncidentUpdateRequest, user: dict) -> dict:
        self.ensure_in_scope(user, incident_id)

        gravite = PRIORITY_TO_GRAVITE.get(payload.priority)
        statut = STATUS_TO_DB.get(payload.status or "", "DECLARE")
        secteur_id, entite_id = self._resolve_sector_and_entity(
            payload.secteurId, payload.zone, payload.entiteId
        )
        score = score_from_priority(payload.priority)
        localisation = f"{payload.lat if payload.lat is not None else 48.8566},{payload.lng if payload.lng is not None else 2.3522}"

        photo_rows = _repo.delete_photos(incident_id)
        for pr in photo_rows:
            cleanup_upload_file(pr.get("chemin_fichier"))

        affected = _repo.update(
            incident_id=incident_id,
            titre=payload.title,
            description=payload.description,
            statut=statut,
            gravite=gravite,
            risk_score=score,
            localisation_gps=localisation,
            secteur_id=secteur_id,
            entite_id=entite_id,
        )
        if affected == 0:
            raise NotFoundError("Incident introuvable.")

        if payload.photoUrl:
            photo_ref = save_data_url_to_file(payload.photoUrl)
            _repo.insert_photo(incident_id, photo_ref, "Updated from web app")

        row = _repo.find_by_id(incident_id)
        return map_incident_row(row)

    def delete_incident(self, incident_id: int, user: dict) -> None:
        self.ensure_in_scope(user, incident_id)
        photo_rows = _repo.delete_photos(incident_id)
        for pr in photo_rows:
            cleanup_upload_file(pr.get("chemin_fichier"))
        affected = _repo.delete(incident_id)
        if affected == 0:
            raise NotFoundError("Incident introuvable.")

    def update_status(self, incident_id: int, status: str) -> None:
        _repo.update_status(incident_id, status)