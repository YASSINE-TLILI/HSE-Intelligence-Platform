from typing import Any

from app.core.database import db_cursor, fetch_all, fetch_one

INCIDENT_SELECT = """
SELECT
  i.id_incident,
  i.titre,
  i.description,
  i.date_declaration,
  i.statut,
  i.gravite,
  i.risk_score,
  i.id_secteur,
  i.id_entite,
  i.localisation_gps,
  z.nom_zone AS zone_name,
  s.nom_secteur AS secteur_name,
  e.nom_entite,
  CONCAT(COALESCE(u.prenom, ''), ' ', COALESCE(u.nom, '')) AS reporter_name,
  p.chemin_fichier AS photo_path
FROM incident i
LEFT JOIN secteur s ON s.id_secteur = i.id_secteur
LEFT JOIN zone z ON z.id_zone = s.id_zone
LEFT JOIN entite e ON e.id_entite = COALESCE(i.id_entite, z.id_entite)
LEFT JOIN utilisateur u ON u.id = i.id_declarant
LEFT JOIN photo p ON p.id_incident = i.id_incident
"""


class IncidentRepository:
    """Accès aux données pour la table incident."""

    def find_by_id(self, incident_id: int) -> dict[str, Any] | None:
        rows = fetch_all(f"{INCIDENT_SELECT} WHERE i.id_incident = %s LIMIT 1", (incident_id,))
        return rows[0] if rows else None

    def find_all_in_scope(self, where_sql: str, where_params: tuple) -> list[dict[str, Any]]:
        return fetch_all(
            f"{INCIDENT_SELECT} WHERE ({where_sql}) ORDER BY i.date_declaration DESC",
            where_params,
        )

    def find_in_scope_by_id(self, incident_id: int, where_sql: str, where_params: tuple) -> dict[str, Any] | None:
        row = fetch_one(
            f"SELECT i.id_incident FROM incident i WHERE i.id_incident = %s AND ({where_sql}) LIMIT 1",
            (incident_id, *where_params),
        )
        return row

    def create(
        self,
        titre: str,
        description: str,
        gravite: str,
        risk_score: int,
        localisation_gps: str,
        declarant_id: int,
        secteur_id: int,
        entite_id: int,
    ) -> int:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                INSERT INTO incident
                  (titre, description, statut, gravite, probabilite, exposition, niveau_urgence,
                   priorite, risk_score, localisation_gps, type_incident, id_declarant, id_secteur, id_entite)
                VALUES
                  (%s, %s, 'DECLARE', %s, 1, 1, 'MOYEN', 2, %s, %s, 'SITUATION_DANGEREUSE', %s, %s, %s)
                """,
                (titre, description, gravite, risk_score, localisation_gps, declarant_id, secteur_id, entite_id),
            )
            return int(cursor.lastrowid)

    def update(
        self,
        incident_id: int,
        titre: str,
        description: str,
        statut: str,
        gravite: str,
        risk_score: int,
        localisation_gps: str,
        secteur_id: int,
        entite_id: int,
    ) -> int:
        with db_cursor() as (_conn, cursor):
            affected = cursor.execute(
                """
                UPDATE incident
                SET titre = %s, description = %s, statut = %s, gravite = %s,
                    risk_score = %s, localisation_gps = %s, id_secteur = %s, id_entite = %s
                WHERE id_incident = %s
                """,
                (titre, description, statut, gravite, risk_score, localisation_gps, secteur_id, entite_id, incident_id),
            )
            return int(affected)

    def delete(self, incident_id: int) -> int:
        with db_cursor() as (_conn, cursor):
            affected = cursor.execute("DELETE FROM incident WHERE id_incident = %s", (incident_id,))
            return int(affected)

    def update_status(self, incident_id: int, status: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute("UPDATE incident SET statut = %s WHERE id_incident = %s", (status, incident_id))

    def find_photo(self, incident_id: int) -> dict[str, Any] | None:
        return fetch_one("SELECT chemin_fichier FROM photo WHERE id_incident = %s LIMIT 1", (incident_id,))

    def insert_photo(self, incident_id: int, chemin: str, annotation: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "INSERT INTO photo (chemin_fichier, annotation, id_incident) VALUES (%s, %s, %s)",
                (chemin, annotation, incident_id),
            )

    def delete_photos(self, incident_id: int) -> list[dict[str, Any]]:
        rows = fetch_all("SELECT chemin_fichier FROM photo WHERE id_incident = %s", (incident_id,))
        with db_cursor() as (_conn, cursor):
            cursor.execute("DELETE FROM photo WHERE id_incident = %s", (incident_id,))
        return rows

    def find_by_risk_in_zone(self, zone_id: int) -> list[dict[str, Any]]:
        return fetch_all(
            """
            SELECT i.risk_score
            FROM incident i
            INNER JOIN secteur s ON s.id_secteur = i.id_secteur
            WHERE s.id_zone = %s
            """,
            (zone_id,),
        )

    def find_by_risk_in_sector(self, sector_id: int) -> list[dict[str, Any]]:
        return fetch_all("SELECT risk_score FROM incident WHERE id_secteur = %s", (sector_id,))

    def find_all_risk_scores(self) -> list[dict[str, Any]]:
        return fetch_all("SELECT risk_score FROM incident")

    def find_in_scope_by_statuses(
        self, statuses: list[str], where_scope: str, params_scope: tuple
    ) -> list[dict[str, Any]]:
        placeholders = ",".join(["%s"] * len(statuses))
        return fetch_all(
            f"""
            SELECT i.id_incident, i.titre, i.description, i.statut, i.date_declaration
            FROM incident i
            WHERE i.statut IN ({placeholders})
              AND ({where_scope})
            ORDER BY date_declaration DESC
            """,
            tuple([*statuses, *params_scope]),
        )

    def find_for_report(self, where_sql: str, params: list) -> list[dict[str, Any]]:
        return fetch_all(
            f"""
            SELECT
              i.id_incident, i.date_declaration, i.statut, i.gravite,
              i.risk_score, i.type_incident, i.id_secteur,
              s.nom_secteur, s.id_zone
            FROM incident i
            LEFT JOIN secteur s ON s.id_secteur = i.id_secteur
            WHERE {where_sql}
            ORDER BY i.date_declaration ASC
            """,
            tuple(params),
        )

    def find_references(self) -> list[dict[str, Any]]:
        return fetch_all(
            """
            SELECT
              e.id_entite, e.nom_entite,
              z.id_zone, z.nom_zone,
              s.id_secteur, s.nom_secteur
            FROM entite e
            LEFT JOIN zone z ON z.id_entite = e.id_entite
            LEFT JOIN secteur s ON s.id_zone = z.id_zone
            ORDER BY e.nom_entite ASC, z.nom_zone ASC, s.nom_secteur ASC
            """
        )

    def find_secteur_with_zone(self, secteur_id: int) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT s.id_secteur, z.id_entite
            FROM secteur s
            INNER JOIN zone z ON z.id_zone = s.id_zone
            WHERE s.id_secteur = %s LIMIT 1
            """,
            (secteur_id,),
        )

    def find_secteur_by_nom(self, nom: str) -> dict[str, Any] | None:
        rows = fetch_all("SELECT id_secteur FROM secteur WHERE nom_secteur = %s LIMIT 1", (nom,))
        return rows[0] if rows else None

    def count_secteurs_of_responsable(self, user_id: int) -> int:
        row = fetch_one("SELECT COUNT(*) AS c FROM secteur WHERE id_responsable_secteur = %s", (user_id,))
        return int((row or {}).get("c") or 0)

    def count_zones_of_responsable(self, user_id: int) -> int:
        row = fetch_one("SELECT COUNT(*) AS c FROM zone WHERE id_responsable_zone = %s", (user_id,))
        return int((row or {}).get("c") or 0)

    def count_entites_of_responsable(self, user_id: int) -> int:
        row = fetch_one("SELECT COUNT(*) AS c FROM entite WHERE id_responsable_hse = %s", (user_id,))
        return int((row or {}).get("c") or 0)