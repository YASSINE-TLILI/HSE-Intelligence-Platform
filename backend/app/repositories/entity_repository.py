from typing import Any, Optional
from app.core.database import db_cursor, fetch_all, fetch_one


class EntityRepository:

    # ─────────────── ENTITES ───────────────
    def get_all_entites(self, search: Optional[str] = None, id_site: Optional[int] = None, skip: int = 0, limit: int = 50) -> tuple[list[dict[str, Any]], int]:
        where_clauses = []
        params = []

        if search:
            where_clauses.append("e.nom_entite LIKE %s")
            params.append(f"%{search}%")
        if id_site:
            where_clauses.append("e.id_site = %s")
            params.append(id_site)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        total_row = fetch_one(f"SELECT COUNT(*) as total FROM entite e WHERE {where_sql}", tuple(params))
        total = int((total_row or {}).get("total") or 0)

        rows = fetch_all(
            f"""
            SELECT
              e.id_entite,
              e.nom_entite,
              e.description,
              e.id_site,
              e.id_responsable_entite,
              u.id AS resp_id,
              u.nom AS resp_nom,
              u.prenom AS resp_prenom,
              u.email AS resp_email,
              COUNT(z.id_zone) AS nb_zones
            FROM entite e
            LEFT JOIN utilisateur u ON u.id = e.id_responsable_entite
            LEFT JOIN zone z ON z.id_entite = e.id_entite
            WHERE {where_sql}
            GROUP BY e.id_entite
            ORDER BY e.nom_entite ASC
            LIMIT %s OFFSET %s
            """,
            tuple(params + [limit, skip])
        )
        return rows, total

    def get_entite_by_id(self, id_entite: int) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT
              e.id_entite,
              e.nom_entite,
              e.description,
              e.id_site,
              e.id_responsable_entite,
              u.id AS resp_id,
              u.nom AS resp_nom,
              u.prenom AS resp_prenom,
              u.email AS resp_email
            FROM entite e
            LEFT JOIN utilisateur u ON u.id = e.id_responsable_entite
            WHERE e.id_entite = %s
            LIMIT 1
            """,
            (id_entite,)
        )

    def create_entite(self, data: dict) -> dict[str, Any]:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                INSERT INTO entite (nom_entite, description, id_site, id_responsable_entite)
                VALUES (%s, %s, %s, %s)
                """,
                (data.get("nom_entite"), data.get("description"), data.get("id_site"), data.get("id_responsable_entite"))
            )
            new_id = cursor.lastrowid
        return self.get_entite_by_id(new_id)

    def update_entite(self, id_entite: int, data: dict) -> dict[str, Any]:
        with db_cursor() as (_conn, cursor):
            fields = [f"{k} = %s" for k in data.keys()]
            params = list(data.values()) + [id_entite]
            cursor.execute(f"UPDATE entite SET {', '.join(fields)} WHERE id_entite = %s", tuple(params))
        return self.get_entite_by_id(id_entite)

    def delete_entite(self, id_entite: int) -> int:
        with db_cursor() as (_conn, cursor):
            return int(cursor.execute("DELETE FROM entite WHERE id_entite = %s", (id_entite,)))


    # ─────────────── ZONES ───────────────
    def get_all_zones(self, search: Optional[str] = None, id_entite: Optional[int] = None, skip: int = 0, limit: int = 50) -> tuple[list[dict[str, Any]], int]:
        where_clauses = []
        params = []

        if search:
            where_clauses.append("z.nom_zone LIKE %s")
            params.append(f"%{search}%")
        if id_entite:
            where_clauses.append("z.id_entite = %s")
            params.append(id_entite)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        total_row = fetch_one(f"SELECT COUNT(*) as total FROM zone z WHERE {where_sql}", tuple(params))
        total = int((total_row or {}).get("total") or 0)

        rows = fetch_all(
            f"""
            SELECT
              z.id_zone,
              z.nom_zone,
              z.safety_score,
              z.id_entite,
              z.id_responsable_zone,
              u.id AS resp_id,
              u.nom AS resp_nom,
              u.prenom AS resp_prenom,
              u.email AS resp_email,
              e.nom_entite AS entite_nom,
              COUNT(s.id_secteur) AS nb_secteurs
            FROM zone z
            LEFT JOIN utilisateur u ON u.id = z.id_responsable_zone
            LEFT JOIN entite e ON e.id_entite = z.id_entite
            LEFT JOIN secteur s ON s.id_zone = z.id_zone
            WHERE {where_sql}
            GROUP BY z.id_zone
            ORDER BY z.nom_zone ASC
            LIMIT %s OFFSET %s
            """,
            tuple(params + [limit, skip])
        )
        return rows, total

    def get_zone_by_id(self, id_zone: int) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT
              z.id_zone,
              z.nom_zone,
              z.safety_score,
              z.id_entite,
              z.id_responsable_zone,
              u.id AS resp_id,
              u.nom AS resp_nom,
              u.prenom AS resp_prenom,
              u.email AS resp_email,
              e.nom_entite AS entite_nom
            FROM zone z
            LEFT JOIN utilisateur u ON u.id = z.id_responsable_zone
            LEFT JOIN entite e ON e.id_entite = z.id_entite
            WHERE z.id_zone = %s
            LIMIT 1
            """,
            (id_zone,)
        )

    def create_zone(self, data: dict) -> dict[str, Any]:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "INSERT INTO zone (nom_zone, safety_score, id_entite, id_responsable_zone) VALUES (%s,%s,%s,%s)",
                (data.get("nom_zone"), data.get("safety_score"), data.get("id_entite"), data.get("id_responsable_zone"))
            )
            new_id = cursor.lastrowid
        return self.get_zone_by_id(new_id)

    def update_zone(self, id_zone: int, data: dict) -> dict[str, Any]:
        with db_cursor() as (_conn, cursor):
            fields = [f"{k} = %s" for k in data.keys()]
            params = list(data.values()) + [id_zone]
            cursor.execute(f"UPDATE zone SET {', '.join(fields)} WHERE id_zone = %s", tuple(params))
        return self.get_zone_by_id(id_zone)

    def delete_zone(self, id_zone: int) -> int:
        with db_cursor() as (_conn, cursor):
            return int(cursor.execute("DELETE FROM zone WHERE id_zone = %s", (id_zone,)))


    # ─────────────── SECTEURS ───────────────
    def get_all_secteurs(self, search: Optional[str] = None, id_zone: Optional[int] = None, id_entite: Optional[int] = None, skip: int = 0, limit: int = 50) -> tuple[list[dict[str, Any]], int]:
        where_clauses = []
        params = []

        if search:
            where_clauses.append("s.nom_secteur LIKE %s")
            params.append(f"%{search}%")
        if id_zone:
            where_clauses.append("s.id_zone = %s")
            params.append(id_zone)
        if id_entite:
            where_clauses.append("z.id_entite = %s")
            params.append(id_entite)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        total_row = fetch_one(
            f"""
            SELECT COUNT(*) as total
            FROM secteur s
            LEFT JOIN zone z ON z.id_zone = s.id_zone
            WHERE {where_sql}
            """,
            tuple(params)
        )
        total = int((total_row or {}).get("total") or 0)

        rows = fetch_all(
            f"""
            SELECT
              s.id_secteur,
              s.nom_secteur,
              s.description,
              s.id_zone,
              s.id_responsable_secteur,
              u.id AS resp_id,
              u.nom AS resp_nom,
              u.prenom AS resp_prenom,
              u.email AS resp_email,
              z.nom_zone AS zone_nom,
              z.id_entite,
              e.nom_entite AS entite_nom
            FROM secteur s
            LEFT JOIN utilisateur u ON u.id = s.id_responsable_secteur
            LEFT JOIN zone z ON z.id_zone = s.id_zone
            LEFT JOIN entite e ON e.id_entite = z.id_entite
            WHERE {where_sql}
            ORDER BY s.nom_secteur ASC
            LIMIT %s OFFSET %s
            """,
            tuple(params + [limit, skip])
        )
        return rows, total

    def get_secteur_by_id(self, id_secteur: int) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT
              s.id_secteur,
              s.nom_secteur,
              s.description,
              s.id_zone,
              s.id_responsable_secteur,
              u.id AS resp_id,
              u.nom AS resp_nom,
              u.prenom AS resp_prenom,
              u.email AS resp_email,
              z.nom_zone AS zone_nom,
              z.id_entite,
              e.nom_entite AS entite_nom
            FROM secteur s
            LEFT JOIN utilisateur u ON u.id = s.id_responsable_secteur
            LEFT JOIN zone z ON z.id_zone = s.id_zone
            LEFT JOIN entite e ON e.id_entite = z.id_entite
            WHERE s.id_secteur = %s
            LIMIT 1
            """,
            (id_secteur,)
        )

    def create_secteur(self, data: dict) -> dict[str, Any]:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "INSERT INTO secteur (nom_secteur, description, id_zone, id_responsable_secteur) VALUES (%s,%s,%s,%s)",
                (data.get("nom_secteur"), data.get("description"), data.get("id_zone"), data.get("id_responsable_secteur"))
            )
            new_id = cursor.lastrowid
        return self.get_secteur_by_id(new_id)

    def update_secteur(self, id_secteur: int, data: dict) -> dict[str, Any]:
        with db_cursor() as (_conn, cursor):
            fields = [f"{k} = %s" for k in data.keys()]
            params = list(data.values()) + [id_secteur]
            cursor.execute(f"UPDATE secteur SET {', '.join(fields)} WHERE id_secteur = %s", tuple(params))
        return self.get_secteur_by_id(id_secteur)

    def delete_secteur(self, id_secteur: int) -> int:
        with db_cursor() as (_conn, cursor):
            return int(cursor.execute("DELETE FROM secteur WHERE id_secteur = %s", (id_secteur,)))


    # ─────────────── SELECT HELPERS ───────────────

    def get_users_for_select(self, role: Optional[str] = None) -> list[dict[str, Any]]:
        """
        Retourne les utilisateurs actifs pour les listes déroulantes des modals.
        Si `role` est fourni, filtre par ce rôle exact.
        Sinon retourne tous les utilisateurs actifs pouvant être responsables
        (RESPONSABLE_ENTITE, RESPONSABLE_ZONE, RESPONSABLE_SECTEUR, ADMINISTRATEUR).
        """
        if role:
            return fetch_all(
                """
                SELECT id, nom, prenom, email, role
                FROM utilisateur
                WHERE active = 1 AND role = %s
                ORDER BY nom ASC, prenom ASC
                """,
                (role.upper(),)
            ) or []

        return fetch_all(
            """
            SELECT id, nom, prenom, email, role
            FROM utilisateur
            WHERE active = 1
              AND role IN (
                'RESPONSABLE_ENTITE',
                'RESPONSABLE_ZONE',
                'RESPONSABLE_SECTEUR',
                'ADMINISTRATEUR'
              )
            ORDER BY nom ASC, prenom ASC
            """,
            ()
        ) or []

    def get_sites_for_select(self) -> list[dict[str, Any]]:
        """
        Retourne tous les sites pour la liste déroulante du modal Entité.
        """
        return fetch_all(
            """
            SELECT id_site, nom_site
            FROM site
            ORDER BY nom_site ASC
            """,
            ()
        ) or []


# ─────────────── INSTANCE ───────────────
entity_repository = EntityRepository()