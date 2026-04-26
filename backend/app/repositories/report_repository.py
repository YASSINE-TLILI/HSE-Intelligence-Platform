import json
from typing import Any

from app.core.database import db_cursor, fetch_all, fetch_one


class ReportRepository:
    """Accès aux données pour la table report_hse."""

    def create(
        self,
        date_start: str,
        date_end: str,
        scope_type: str,
        scope_id: int | None,
        content: dict,
        user_id: int,
    ) -> int:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                INSERT INTO report_hse (periode_debut, periode_fin, scope_type, scope_id, contenu_json, genere_par)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (date_start, date_end, scope_type, scope_id, json.dumps(content), user_id),
            )
            return int(cursor.lastrowid)

    def find_all(self) -> list[dict[str, Any]]:
        return fetch_all(
            """
            SELECT id_report, periode_debut, periode_fin, scope_type, scope_id, date_generation, genere_par
            FROM report_hse ORDER BY date_generation DESC
            """
        )

    def find_by_id(self, report_id: int) -> dict[str, Any] | None:
        row = fetch_one(
            """
            SELECT id_report, periode_debut, periode_fin, scope_type, scope_id,
                   contenu_json, date_generation, genere_par
            FROM report_hse WHERE id_report = %s LIMIT 1
            """,
            (report_id,),
        )
        if row:
            row["contenu_json"] = json.loads(row["contenu_json"])
        return row
    def update_type_incident(self, incident_id: int, type_incident: str) -> None:
        """Met à jour le type d'incident (incident/anomalie)."""
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE incident SET type_incident = %s WHERE id_incident = %s",
                (type_incident, incident_id),
            )