# app/services/incident_service.py

from app.core.constants import PRIORITY_TO_GRAVITE, STATUS_TO_DB
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.repositories.incident_repository import IncidentRepository
from app.schemas.incidents import IncidentCreateRequest, IncidentUpdateRequest
from app.utils.file_utils import cleanup_upload_file, save_data_url_to_file
from app.utils.mappers import map_incident_row, score_from_priority

_repo = IncidentRepository()


def _notif_service():
    """Import lazy pour éviter la dépendance circulaire."""
    from app.services.notification_service import NotificationService
    return NotificationService()


class IncidentService:

    def _build_scope_filter(self, user: dict) -> tuple[str, tuple]:
        role         = (user.get("role") or "").upper()
        user_id      = int(user.get("id") or 0)
        scope_id     = user.get("scope_id")
        user_site_id = user.get("id_site")

        if role == "ADMINISTRATEUR":
            return "1=1", ()

        if role == "DECLARANT":
            return "i.id_declarant = %s", (user_id,)

        if role == "RESPONSABLE_SECTEUR":
            sid = scope_id or user.get("id_secteur")
            if sid:
                return "i.id_secteur = %s", (int(sid),)
            return (
                "i.id_secteur IN (SELECT s.id_secteur FROM secteur s WHERE s.id_responsable_secteur = %s)",
                (user_id,),
            )

        if role == "RESPONSABLE_ZONE":
            zid = scope_id or user.get("id_zone")
            if zid:
                return (
                    "i.id_secteur IN (SELECT s.id_secteur FROM secteur s WHERE s.id_zone = %s)",
                    (int(zid),),
                )
            return (
                "i.id_secteur IN (SELECT s.id_secteur FROM secteur s "
                "INNER JOIN zone z ON z.id_zone = s.id_zone WHERE z.id_responsable_zone = %s)",
                (user_id,),
            )

        if role == "RESPONSABLE_ENTITE":
            eid = scope_id or user.get("id_entite")
            if eid:
                return (
                    "i.id_secteur IN (SELECT s.id_secteur FROM secteur s "
                    "INNER JOIN zone z ON z.id_zone = s.id_zone WHERE z.id_entite = %s)",
                    (int(eid),),
                )
            return (
                "i.id_secteur IN (SELECT s.id_secteur FROM secteur s "
                "INNER JOIN zone z ON z.id_zone = s.id_zone "
                "INNER JOIN entite e ON e.id_entite = z.id_entite WHERE e.id_responsable_entite = %s)",
                (user_id,),
            )

        if user_site_id is not None:
            return (
                "i.id_secteur IN (SELECT s.id_secteur FROM secteur s "
                "INNER JOIN zone z ON z.id_zone = s.id_zone "
                "INNER JOIN entite e ON e.id_entite = z.id_entite WHERE e.id_site = %s)",
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

    # ─── CRUD ────────────────────────────────────────────────────────────────

    def list_incidents(self, user: dict) -> list[dict]:
        where_sql, where_params = self._build_scope_filter(user)
        rows = _repo.find_all_in_scope(where_sql, where_params)
        return [map_incident_row(row) for row in rows]

    def get_stats(self, user: dict) -> dict:
        """Retourne les compteurs KPI adaptés au rôle et au périmètre de l'utilisateur"""
        role = (user.get("role") or "").upper()
        user_id = int(user.get("id") or 0)
        
        # Déterminer le scope_id selon le rôle
        id_scope = None
        if role == "RESPONSABLE_SECTEUR":
            id_scope = user.get("id_secteur") or user.get("scope_id")
        elif role == "RESPONSABLE_ZONE":
            id_scope = user.get("id_zone") or user.get("scope_id")
        elif role == "RESPONSABLE_ENTITE":
            id_scope = user.get("id_entite") or user.get("scope_id")
        elif role == "ADMINISTRATEUR":
            role = "ADMIN"  # Normaliser pour la méthode existante
            id_scope = None
        
        # Utiliser la méthode build_scope_filter existante
        if id_scope is not None:
            scope_sql, scope_params = _repo.build_scope_filter(role, id_scope)
        else:
            scope_sql, scope_params = "1=1", ()
        
        # Récupérer les statistiques avec le filtre de scope
        return _repo.get_stats(scope_sql, scope_params, role, id_scope, user_id)
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

    def get_incident(self, incident_id: int, user: dict) -> dict:
        self.ensure_in_scope(user, incident_id)
        row = _repo.find_by_id(incident_id)
        if not row:
            raise NotFoundError("Incident introuvable.")
        return map_incident_row(row)

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
        localisation = (
            f"{payload.lat if payload.lat is not None else 48.8566},"
            f"{payload.lng if payload.lng is not None else 2.3522}"
        )

        incident_id = _repo.create(
            description=payload.description,
            gravite=gravite,
            risk_score=score,
            localisation_gps=localisation,
            declarant_id=int(user["id"]),
            secteur_id=secteur_id,
            entite_id=entite_id,
            type_incident=payload.type_incident or "incident",
        )

        if payload.photoUrl:
            photo_ref = save_data_url_to_file(payload.photoUrl)
            _repo.insert_photo(incident_id, photo_ref, "Uploaded from web app")

        # Workflow notification — étape 1 : alerter le responsable secteur
        try:
            _notif_service().notify_new_incident(incident_id)
        except Exception as exc:
            print(f"[NOTIF] notify_new_incident: {exc}")

        row = _repo.find_by_id(incident_id)
        return map_incident_row(row)

    def update_incident(self, incident_id: int, payload: IncidentUpdateRequest, user: dict) -> dict:
        self.ensure_in_scope(user, incident_id)

        gravite = PRIORITY_TO_GRAVITE.get(payload.priority)
        statut  = STATUS_TO_DB.get(payload.status or "", "En attente")
        secteur_id, entite_id = self._resolve_sector_and_entity(
            payload.secteurId, payload.zone, payload.entiteId
        )
        score = score_from_priority(payload.priority)
        localisation = (
            f"{payload.lat if payload.lat is not None else 48.8566},"
            f"{payload.lng if payload.lng is not None else 2.3522}"
        )

        photo_rows = _repo.delete_photos(incident_id)
        for pr in photo_rows:
            cleanup_upload_file(pr.get("chemin_fichier"))

        affected = _repo.update(
            incident_id=incident_id,
            description=payload.description,
            statut=statut,
            gravite=gravite,
            risk_score=score,
            localisation_gps=localisation,
            secteur_id=secteur_id,
            entite_id=entite_id,
            type_incident=payload.type_incident or "incident",
        )
        if affected == 0:
            raise NotFoundError("Incident introuvable.")

        if payload.photoUrl:
            photo_ref = save_data_url_to_file(payload.photoUrl)
            _repo.insert_photo(incident_id, photo_ref, "Updated from web app")

        row = _repo.find_by_id(incident_id)
        return map_incident_row(row)

    def get_top_declarants(self, days: int = 30, limit: int = 10) -> list[dict]:
        allowed_days = {7, 30, 90}
        if days not in allowed_days:
            days = 30
        rows = _repo.get_top_declarants(days=days, limit=limit)
        return [
            {
                "id": r["id"],
                "full_name": (r["full_name"] or "").strip() or f"User #{r['id']}",
                "total_incidents": int(r["total_incidents"]),
            }
            for r in rows
        ]

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

    # ─── Scope filters frontend ───────────────────────────────────────────────

    def get_scope_filters(self, user: dict) -> dict:
        from app.repositories.entity_repository import entity_repository

        role     = (user.get("role") or "").upper()
        scope_id = user.get("scope_id")

        result = {
            "role": role,
            "scope_id": scope_id,
            "entites": [],
            "zones": [],
            "secteurs": [],
            "locked": {"entite": False, "zone": False, "secteur": False},
        }

        if role == "ADMINISTRATEUR":
            rows, _ = entity_repository.get_all_entites(limit=500)
            result["entites"] = [{"id": r["id_entite"], "nom": r["nom_entite"]} for r in rows]
            return result

        if role == "RESPONSABLE_ENTITE":
            eid = scope_id or user.get("id_entite")
            if eid:
                entite = entity_repository.get_entite_by_id(int(eid))
                if entite:
                    result["entites"] = [{"id": entite["id_entite"], "nom": entite["nom_entite"]}]
                    result["locked"]["entite"] = True
                zones_rows, _ = entity_repository.get_all_zones(id_entite=int(eid), limit=500)
                result["zones"] = [{"id": r["id_zone"], "nom": r["nom_zone"]} for r in zones_rows]
            return result

        if role == "RESPONSABLE_ZONE":
            zid = scope_id or user.get("id_zone")
            if zid:
                zone = entity_repository.get_zone_by_id(int(zid))
                if zone:
                    result["zones"] = [{"id": zone["id_zone"], "nom": zone["nom_zone"]}]
                    result["locked"]["zone"] = True
                    if zone.get("id_entite"):
                        entite = entity_repository.get_entite_by_id(zone["id_entite"])
                        if entite:
                            result["entites"] = [{"id": entite["id_entite"], "nom": entite["nom_entite"]}]
                            result["locked"]["entite"] = True
                    sect_rows, _ = entity_repository.get_all_secteurs(id_zone=int(zid), limit=500)
                    result["secteurs"] = [{"id": r["id_secteur"], "nom": r["nom_secteur"]} for r in sect_rows]
            return result

        if role == "RESPONSABLE_SECTEUR":
            sid = scope_id or user.get("id_secteur")
            if sid:
                secteur = entity_repository.get_secteur_by_id(int(sid))
                if secteur:
                    result["secteurs"] = [{"id": secteur["id_secteur"], "nom": secteur["nom_secteur"]}]
                    result["locked"]["secteur"] = True
                    if secteur.get("id_zone"):
                        zone = entity_repository.get_zone_by_id(secteur["id_zone"])
                        if zone:
                            result["zones"] = [{"id": zone["id_zone"], "nom": zone["nom_zone"]}]
                            result["locked"]["zone"] = True
                            if zone.get("id_entite"):
                                entite = entity_repository.get_entite_by_id(zone["id_entite"])
                                if entite:
                                    result["entites"] = [{"id": entite["id_entite"], "nom": entite["nom_entite"]}]
                                    result["locked"]["entite"] = True
            return result

        return result
    def get_priority_distribution(self, user: dict, date_from: str = None, date_to: str = None) -> list[dict]:
        where_sql, where_params = self._build_scope_filter(user)
        rows = _repo.get_priority_distribution(where_sql, where_params, date_from=date_from, date_to=date_to)
        
        GRAVITE_LABEL = {
            "CRITIQUE": {"label": "Critique", "color": "#ef4444", "order": 1},
            "GRAVE":    {"label": "Grave",    "color": "#f97316", "order": 2},
            "MODEREE":  {"label": "Modérée",  "color": "#eab308", "order": 3},
            "FAIBLE":   {"label": "Faible",   "color": "#22c55e", "order": 4},
        }
        # Agréger incidents + anomalies par gravité
        agg = {}
        for row in rows:
            g = row.get("gravite") or "FAIBLE"
            if g not in agg:
                agg[g] = {"gravite": g, "incidents": 0, "anomalies": 0, "total": 0, **GRAVITE_LABEL.get(g, {"label": g, "color": "#94a3b8", "order": 99})}
            t = int(row.get("total") or 0)
            if row.get("type_incident") == "anomalie":
                agg[g]["anomalies"] += t
            else:
                agg[g]["incidents"] += t
            agg[g]["total"] += t
        
        return sorted(agg.values(), key=lambda x: x["order"])
 
    def get_status_distribution(self, user: dict, date_from: str = None, date_to: str = None) -> list[dict]:
        where_sql, where_params = self._build_scope_filter(user)
        rows = _repo.get_status_distribution(where_sql, where_params, date_from=date_from, date_to=date_to)
        
        STATUS_META = {
            "En attente":                    {"label": "En attente",            "color": "#f59e0b", "group": "en_cours"},
            "EN_ATTENTE_VALIDATION_SECTEUR": {"label": "Attente valid. secteur","color": "#fb923c", "group": "en_cours"},
            "VALIDE_SECTEUR":               {"label": "Validé secteur",         "color": "#60a5fa", "group": "en_cours"},
            "EN_ATTENTE_VALIDATION_ZONE":   {"label": "Attente valid. zone",    "color": "#a78bfa", "group": "en_cours"},
            "VALIDE_ZONE":                  {"label": "Validé zone",            "color": "#818cf8", "group": "en_cours"},
            "EN_ATTENTE_VALIDATION_ENTITE": {"label": "Attente valid. entité",  "color": "#e879f9", "group": "en_cours"},
            "VALIDE_ENTITE":               {"label": "Validé entité",           "color": "#34d399", "group": "en_cours"},
            "REJETE":                      {"label": "Rejeté",                  "color": "#f87171", "group": "termine"},
            "CLOTURE":                     {"label": "Clôturé",                 "color": "#10b981", "group": "termine"},
        }
        result = []
        for row in rows:
            s = row.get("statut") or ""
            meta = STATUS_META.get(s, {"label": s, "color": "#94a3b8", "group": "autre"})
            result.append({
                "statut": s,
                "label": meta["label"],
                "color": meta["color"],
                "group": meta["group"],
                "total": int(row.get("total") or 0),
            })
        return result
 
    def get_incidents_by_scope(self, user: dict, days: int = 30) -> dict:
        """Retourne incidents groupés selon le rôle de l'utilisateur."""
        role = (user.get("role") or "").upper()
        scope_id = user.get("scope_id")
 
        if role == "RESPONSABLE_SECTEUR":
            sid = scope_id or user.get("id_secteur")
            if not sid:
                return {"type": "secteur", "data": [], "label": "Votre secteur"}
            rows = _repo.get_incidents_by_secteur([int(sid)], days)
            return {"type": "secteur", "data": rows, "label": "Votre secteur", "days": days}
 
        elif role == "RESPONSABLE_ZONE":
            zid = scope_id or user.get("id_zone")
            if not zid:
                return {"type": "zone", "data": [], "label": "Votre zone"}
            secteur_rows = _repo.get_secteurs_of_zone(int(zid))
            secteur_ids = [r["id_secteur"] for r in secteur_rows]
            rows = _repo.get_incidents_by_secteur(secteur_ids, days)
            return {"type": "zone", "data": rows, "label": "Secteurs de votre zone", "days": days}
 
        elif role == "RESPONSABLE_ENTITE":
            eid = scope_id or user.get("id_entite")
            if not eid:
                return {"type": "entite", "data": [], "label": "Votre entité"}
            zone_rows = _repo.get_zones_of_entite(int(eid))
            zone_ids = [r["id_zone"] for r in zone_rows]
            rows = _repo.get_incidents_by_zone(zone_ids, days)
            return {"type": "entite", "data": rows, "label": "Zones de votre entité", "days": days}
 
        else:  # ADMINISTRATEUR
            zone_rows = _repo.get_all_zone_ids()
            zone_ids = [r["id_zone"] for r in zone_rows]
            rows = _repo.get_incidents_by_zone(zone_ids, days)
            return {"type": "admin", "data": rows, "label": "Toutes les zones", "days": days}
 
    def get_closure_rate(self, user: dict, days: int = 30, id_entite: int = None, id_zone: int = None) -> dict:
        """Taux de clôture pour RESPONSABLE_ENTITE et ADMINISTRATEUR."""
        role = (user.get("role") or "").upper()
        
        if role == "RESPONSABLE_ENTITE":
            eid = user.get("scope_id") or user.get("id_entite")
            where_sql = "z.id_entite = %s"
            where_params = (int(eid),) if eid else (0,)
        elif role == "ADMINISTRATEUR":
            if id_entite:
                where_sql = "z.id_entite = %s"
                where_params = (id_entite,)
            elif id_zone:
                where_sql = "z.id_zone = %s"
                where_params = (id_zone,)
            else:
                where_sql = "1=1"
                where_params = ()
        else:
            return {"data": [], "allowed": False}
        
        rows = _repo.get_closure_rate(where_sql, where_params, days)
        total_all = sum(int(r.get("total") or 0) for r in rows)
        closed_all = sum(int(r.get("clotures") or 0) for r in rows)
        global_rate = round(100.0 * closed_all / total_all, 1) if total_all > 0 else 0
        
        return {
            "allowed": True,
            "days": days,
            "global_rate": global_rate,
            "total": total_all,
            "clotures": closed_all,
            "by_entite": [
                {
                    "id_entite": r["id_entite"],
                    "nom_entite": r["nom_entite"],
                    "total": int(r.get("total") or 0),
                    "clotures": int(r.get("clotures") or 0),
                    "taux_cloture": float(r.get("taux_cloture") or 0),
                }
                for r in rows
            ],
        }
 
    def get_top_declarants_scoped(
        self, user: dict, days: int = 30, limit: int = 10,
        id_secteur: int = None, id_zone: int = None, id_entite: int = None
    ) -> list[dict]:
        """Top déclarants avec scope dynamique."""
        role = (user.get("role") or "").upper()
        
        # L'admin peut filtrer manuellement
        if role == "ADMINISTRATEUR":
            if id_secteur:
                where_sql = "i.id_secteur = %s"
                where_params = (id_secteur,)
            elif id_zone:
                where_sql = "i.id_secteur IN (SELECT id_secteur FROM secteur WHERE id_zone = %s)"
                where_params = (id_zone,)
            elif id_entite:
                where_sql = """
                    i.id_secteur IN (
                        SELECT s.id_secteur FROM secteur s
                        JOIN zone z ON z.id_zone = s.id_zone
                        WHERE z.id_entite = %s
                    )
                """
                where_params = (id_entite,)
            else:
                where_sql = "1=1"
                where_params = ()
        else:
            where_sql, where_params = self._build_scope_filter(user)
        
        rows = _repo.get_top_declarants_scoped(where_sql, where_params, days=days, limit=limit)
        return [
            {
                "id": r["id"],
                "full_name": (r["full_name"] or "").strip() or f"User #{r['id']}",
                "total_incidents": int(r["total_incidents"]),
                "critiques": int(r.get("critiques") or 0),
                "graves": int(r.get("graves") or 0),
            }
            for r in rows
        ]