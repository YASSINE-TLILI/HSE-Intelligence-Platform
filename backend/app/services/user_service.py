from typing import Optional

from app.core.exceptions import ForbiddenError, NotFoundError
from app.utils.mappers import map_user_row
from app.repositories.user_repository import UserRepository

_repo = UserRepository()


class UserService:

    def _build_scope_filter(self, user: dict) -> tuple[str, tuple]:
        role     = (user.get("role") or "").upper()
        user_id  = int(user.get("id") or 0)
        site_id  = user.get("id_site")

        if role == "ADMINISTRATEUR":
            return "1=1", ()

        if role == "RESPONSABLE_SECTEUR":
            if _repo.count_secteurs_of_responsable(user_id) > 0:
                return (
                    "u.id_secteur IN (SELECT id_secteur FROM secteur WHERE id_responsable_secteur = %s)",
                    (user_id,),
                )

        if role == "RESPONSABLE_ZONE":
            if _repo.count_zones_of_responsable(user_id) > 0:
                return (
                    "u.id_secteur IN (SELECT s.id_secteur FROM secteur s JOIN zone z ON z.id_zone = s.id_zone WHERE z.id_responsable_zone = %s)",
                    (user_id,),
                )

        if role == "RESPONSABLE_ENTITE":
            if _repo.count_entites_of_responsable(user_id) > 0:
                return (
                    "u.id_secteur IN (SELECT s.id_secteur FROM secteur s JOIN zone z ON z.id_zone = s.id_zone JOIN entite e ON e.id_entite = z.id_entite WHERE e.id_responsable_entite = %s)",
                    (user_id,),
                )

        if site_id is not None:
            return (
                "u.id_secteur IN (SELECT s.id_secteur FROM secteur s JOIN zone z ON z.id_zone = s.id_zone JOIN entite e ON e.id_entite = z.id_entite WHERE e.id_site = %s)",
                (int(site_id),),
            )

        return "1=1", ()

    def list_users(self, user: dict) -> list[dict]:
        where_sql, params = self._build_scope_filter(user)
        rows = _repo.find_users_in_scope(where_sql, params, id_scope=user.get("id_scope"))
        return [map_user_row(row) for row in rows]

    def get_scoped_stats(self, user: dict) -> dict:
        """
        Retourne les statistiques des utilisateurs dans le périmètre du user connecté.

        Règles par rôle :
        - RESPONSABLE_SECTEUR : utilisateurs de son/ses secteurs
            → KPIs : total, déclarants, responsable_zone de la zone parente, responsable_entite de l'entité parente
        - RESPONSABLE_ZONE : utilisateurs des secteurs de sa/ses zones
            → KPIs : total, déclarants, responsables_secteur, responsable_entite de l'entité parente
        - RESPONSABLE_ENTITE : utilisateurs des secteurs de son/ses entités
            → KPIs : total, déclarants, responsables_secteur, responsables_zone
        - ADMINISTRATEUR : tous les utilisateurs
            → KPIs : tout
        """
        role    = (user.get("role") or "").upper()
        user_id = int(user.get("id") or 0)

        where_sql, params = self._build_scope_filter(user)
        stats = _repo.get_scoped_stats(where_sql, params)

        # On enrichit avec des meta spécifiques au rôle
        stats["role"] = role

        # Pour RESPONSABLE_SECTEUR : on ajoute les infos de la zone / entité parentes
        if role == "RESPONSABLE_SECTEUR":
            scope_id = user.get("scope_id") or user.get("id_secteur")
            stats["scope_label"] = "secteur"
            stats["scope_id"] = scope_id
            # Nombre de responsables de zone qui gèrent la zone parente de ce secteur
            from app.core.database import fetch_one
            if scope_id:
                row = fetch_one(
                    """
                    SELECT COUNT(DISTINCT u.id) AS cnt
                    FROM utilisateur u
                    JOIN zone z ON z.id_responsable_zone = u.id
                    JOIN secteur s ON s.id_zone = z.id_zone
                    WHERE s.id_secteur = %s
                    """,
                    (int(scope_id),),
                )
                stats["responsables_zone_scope"] = int((row or {}).get("cnt") or 0)
                row2 = fetch_one(
                    """
                    SELECT COUNT(DISTINCT u.id) AS cnt
                    FROM utilisateur u
                    JOIN entite e ON e.id_responsable_entite = u.id
                    JOIN zone z ON z.id_entite = e.id_entite
                    JOIN secteur s ON s.id_zone = z.id_zone
                    WHERE s.id_secteur = %s
                    """,
                    (int(scope_id),),
                )
                stats["responsables_entite_scope"] = int((row2 or {}).get("cnt") or 0)

        elif role == "RESPONSABLE_ZONE":
            scope_id = user.get("scope_id") or user.get("id_zone")
            stats["scope_label"] = "zone"
            stats["scope_id"] = scope_id
            from app.core.database import fetch_one
            if scope_id:
                # Responsable(s) d'entité qui gèrent l'entité parente de cette zone
                row = fetch_one(
                    """
                    SELECT COUNT(DISTINCT u.id) AS cnt
                    FROM utilisateur u
                    JOIN entite e ON e.id_responsable_entite = u.id
                    JOIN zone z ON z.id_entite = e.id_entite
                    WHERE z.id_zone = %s
                    """,
                    (int(scope_id),),
                )
                stats["responsables_entite_scope"] = int((row or {}).get("cnt") or 0)

        elif role == "RESPONSABLE_ENTITE":
            scope_id = user.get("scope_id") or user.get("id_entite")
            stats["scope_label"] = "entite"
            stats["scope_id"] = scope_id

        else:
            stats["scope_label"] = "global"
            stats["scope_id"] = None

        return stats

    def create_user(self, payload: dict, _current_user: dict | None = None) -> dict:
        user_id = _repo.create_user(
            nom=payload.get("nom"),
            prenom=payload.get("prenom"),
            email=payload.get("email"),
            telephone=payload.get("telephone"),
            adresse=payload.get("adresse"),
            date_naissance=payload.get("dateNaissance"),
            mot_passe=payload.get("mot_passe", ""),
            role=payload.get("role"),
            active=int(payload.get("active", 0)),
            id_secteur=payload.get("idSecteur") or payload.get("id_secteur"),
            id_zone=payload.get("idZone")    or payload.get("id_zone"),
            id_entite=payload.get("idEntite") or payload.get("id_entite"),
            id_site=payload.get("idSite")   or payload.get("id_site"),
            id_entreprise=Optional[payload.get("idEntreprise")] or Optional[payload.get("id_entreprise")],
        )
        row = _repo.find_by_id(user_id)
        return map_user_row(row)

    def update_user(self, user_id: int, payload: dict, current_user: dict) -> dict:
        if current_user.get("role") not in ("ADMINISTRATEUR", "RESPONSABLE_ENTITE"):
            raise ForbiddenError("Accès refusé.")

        affected = _repo.update_user(
            user_id=user_id,
            nom=payload.get("nom"),
            prenom=payload.get("prenom"),
            adresse=payload.get("adresse"),
            telephone=payload.get("telephone"),
            email=payload.get("email"),
            role=payload.get("role"),
            active=bool(payload.get("active")),
            date_naissance=payload.get("dateNaissance"),
            id_site=payload.get("idSite"),
            id_secteur=payload.get("idSecteur"),
            id_zone=payload.get("idZone"),
            id_entite=payload.get("idEntite"),
            id_entreprise=Optional[payload.get("idEntreprise")] or Optional[payload.get("id_entreprise")],
        )

        if affected == 0:
            raise NotFoundError("Utilisateur introuvable.")

        row = _repo.find_by_id(user_id)
        return map_user_row(row)

    def delete_user(self, user_id: int, current_user: dict) -> None:
        if current_user.get("role") != "ADMINISTRATEUR":
            raise ForbiddenError("Seul un administrateur peut supprimer un utilisateur.")

        affected = _repo.delete_user(user_id)
        if affected == 0:
            raise NotFoundError("Utilisateur introuvable.")

    def activate_user(self, user_id: int, active: bool) -> None:
        affected = _repo.activate(user_id, active)
        if affected == 0:
            raise NotFoundError("Utilisateur introuvable.")