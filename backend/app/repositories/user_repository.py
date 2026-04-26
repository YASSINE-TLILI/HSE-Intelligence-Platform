from typing import Any

from app.core.database import db_cursor, fetch_all, fetch_one


class UserRepository:
    """Accès aux données pour la table utilisateur."""

    # ─── Lecture ───────────────────────────────────────────────────────────────

    def find_by_id(self, user_id: int) -> dict[str, Any] | None:
        """Retourne un utilisateur avec ses noms entité/zone/secteur résolus."""
        rows = fetch_all(
            """
            SELECT
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.telephone,
                u.adresse,
                u.role,
                u.active,
                u.date_naissance,
                u.date_creation,
                u.id_site,
                u.id_secteur,
                u.id_zone,
                u.id_entite,
                s.nom_secteur,
                z.nom_zone,
                e.nom_entite
            FROM utilisateur u
            LEFT JOIN secteur s ON s.id_secteur = u.id_secteur
            LEFT JOIN zone    z ON z.id_zone    = u.id_zone
            LEFT JOIN entite  e ON e.id_entite  = u.id_entite
            WHERE u.id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        return rows[0] if rows else None

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT id, nom, prenom, email, role, active, mot_passe,id_secteur,id_zone,id_entite
            FROM utilisateur
            WHERE email = %s
            LIMIT 1
            """,
            (email,),
        )

    def find_users_in_scope(self, where_sql: str, params: tuple, id_scope: int) -> list[dict[str, Any]]:
        """
        Retourne les utilisateurs du périmètre avec noms entité/zone/secteur.
        """
        return fetch_all(
            f"""
            SELECT
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.telephone,
                u.adresse,
                u.role,
                u.active,
                u.date_naissance,
                u.date_creation,
                u.id_site,
                u.id_secteur,
                u.id_zone,
                u.id_entite,
                s.nom_secteur,
                z.nom_zone,
                e.nom_entite
            FROM utilisateur u
            LEFT JOIN secteur s ON s.id_secteur = u.id_secteur
            LEFT JOIN zone    z ON z.id_zone    = u.id_zone
            LEFT JOIN entite  e ON e.id_entite  = u.id_entite
            WHERE {where_sql}
            ORDER BY u.nom ASC, u.prenom ASC
            """,
            params,
        )

    def find_all(self) -> list[dict[str, Any]]:
        return fetch_all("SELECT id, nom, prenom, email, role, active, mot_passe FROM utilisateur")

    def find_by_roles(self, roles: list[str]) -> list[dict[str, Any]]:
        placeholders = ",".join(["%s"] * len(roles))
        return fetch_all(
            f"SELECT id FROM utilisateur WHERE role IN ({placeholders}) AND active = 1",
            tuple(roles),
        )

    def email_exists(self, email: str, exclude_user_id: int | None = None) -> bool:
        if exclude_user_id is None:
            row = fetch_one(
                "SELECT id FROM utilisateur WHERE LOWER(email) = LOWER(%s) LIMIT 1",
                (email,),
            )
        else:
            row = fetch_one(
                "SELECT id FROM utilisateur WHERE LOWER(email) = LOWER(%s) AND id <> %s LIMIT 1",
                (email, exclude_user_id),
            )
        return row is not None

    # ─── Création ──────────────────────────────────────────────────────────────

    def create_user(
        self,
        nom: str,
        prenom: str,
        email: str,
        telephone: str | None,
        adresse: str | None,
        date_naissance,
        mot_passe: str,
        role: str,
        active: int = 0,
        id_secteur: int | None = None,
        id_zone: int | None = None,
        id_entite: int | None = None,
        id_site: int | None = None,
    ) -> int:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                INSERT INTO utilisateur
                    (nom, prenom, email, telephone, adresse, date_naissance,
                     mot_passe, role, active,
                     id_secteur, id_zone, id_entite, id_site,
                     date_creation)
                VALUES
                    (%s, %s, %s, %s, %s, %s,
                     %s, %s, %s,
                     %s, %s, %s, %s,
                     NOW())
                """,
                (
                    nom, prenom, email, telephone, adresse, date_naissance,
                    mot_passe, role, active,
                    id_secteur, id_zone, id_entite, id_site,
                ),
            )
            return int(cursor.lastrowid)

    # ─── Mise à jour ───────────────────────────────────────────────────────────

    def update_user(
        self,
        user_id: int,
        nom: str,
        prenom: str,
        adresse: str | None,
        telephone: str | None,
        email: str,
        role: str,
        active: bool,
        date_naissance,
        id_site: int | None,
        id_secteur: int | None,
        id_zone: int | None,
        id_entite: int | None,
    ) -> int:
        with db_cursor() as (_conn, cursor):
            affected = cursor.execute(
                """
                UPDATE utilisateur
                SET
                    nom            = %s,
                    prenom         = %s,
                    adresse        = %s,
                    telephone      = %s,
                    email          = %s,
                    role           = %s,
                    active         = %s,
                    date_naissance = %s,
                    id_site        = %s,
                    id_secteur     = %s,
                    id_zone        = %s,
                    id_entite      = %s
                WHERE id = %s
                """,
                (
                    nom, prenom, adresse, telephone, email,
                    role, int(active), date_naissance,
                    id_site, id_secteur, id_zone, id_entite,
                    user_id,
                ),
            )
            return int(affected)

    def update_password(self, user_id: int, password_hash: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE utilisateur SET mot_passe = %s WHERE id = %s",
                (password_hash, user_id),
            )

    def update_email(self, user_id: int, email: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE utilisateur SET email = %s WHERE id = %s",
                (email, user_id),
            )

    def activate(self, user_id: int, active: bool = True) -> int:
        with db_cursor() as (_conn, cursor):
            affected = cursor.execute(
                "UPDATE utilisateur SET active = %s WHERE id = %s",
                (int(active), user_id),
            )
            return int(affected)

    # ─── Suppression ───────────────────────────────────────────────────────────

    def delete_user(self, user_id: int) -> int:
        with db_cursor() as (_conn, cursor):
            affected = cursor.execute(
                "DELETE FROM utilisateur WHERE id = %s",
                (user_id,),
            )
            return int(affected)

    # ─── Helpers scope ─────────────────────────────────────────────────────────

    def count_secteurs_of_responsable(self, user_id: int) -> int:
        row = fetch_one(
            "SELECT COUNT(*) AS c FROM secteur WHERE id_responsable_secteur = %s",
            (user_id,),
        )
        return int((row or {}).get("c") or 0)

    def count_zones_of_responsable(self, user_id: int) -> int:
        row = fetch_one(
            "SELECT COUNT(*) AS c FROM zone WHERE id_responsable_zone = %s",
            (user_id,),
        )
        return int((row or {}).get("c") or 0)

    def count_entites_of_responsable(self, user_id: int) -> int:
        row = fetch_one(
            "SELECT COUNT(*) AS c FROM entite WHERE id_responsable_entite = %s",
            (user_id,),
        )
        return int((row or {}).get("c") or 0)

    # ─── Statistiques scopées ──────────────────────────────────────────────────

    def get_scoped_stats(self, where_sql: str, params: tuple) -> dict[str, int]:
        """
        Retourne les statistiques des utilisateurs dans un périmètre donné.
        Compte le total et par rôle dans le scope filtré.
        """
        total_row = fetch_one(
            f"""
            SELECT COUNT(*) AS total
            FROM utilisateur u
            LEFT JOIN secteur s ON s.id_secteur = u.id_secteur
            LEFT JOIN zone    z ON z.id_zone    = u.id_zone
            LEFT JOIN entite  e ON e.id_entite  = u.id_entite
            WHERE {where_sql}
            """,
            params,
        )
        total = int((total_row or {}).get("total") or 0)

        role_counts_rows = fetch_all(
            f"""
            SELECT u.role, COUNT(*) AS cnt
            FROM utilisateur u
            LEFT JOIN secteur s ON s.id_secteur = u.id_secteur
            LEFT JOIN zone    z ON z.id_zone    = u.id_zone
            LEFT JOIN entite  e ON e.id_entite  = u.id_entite
            WHERE {where_sql}
            GROUP BY u.role
            """,
            params,
        )
        counts_by_role: dict[str, int] = {}
        for row in (role_counts_rows or []):
            counts_by_role[row["role"]] = int(row["cnt"])

        return {
            "total": total,
            "declarants": counts_by_role.get("DECLARANT", 0),
            "responsables_secteur": counts_by_role.get("RESPONSABLE_SECTEUR", 0),
            "responsables_zone": counts_by_role.get("RESPONSABLE_ZONE", 0),
            "responsables_entite": counts_by_role.get("RESPONSABLE_ENTITE", 0),
            "administrateurs": counts_by_role.get("ADMINISTRATEUR", 0),
        }