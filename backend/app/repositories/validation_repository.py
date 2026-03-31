from typing import Any

from app.core.database import db_cursor, fetch_all


class ValidationRepository:
    """Accès aux données pour la table validation."""

    def create(
        self,
        incident_id: int,
        level: str,
        status: str,
        description: str | None,
        validated_by: int | None,
    ) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                INSERT INTO validation (statut, description, niveau, id_valide_par, id_incident)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (status, description, level, validated_by, incident_id),
            )

    def find_by_incident(self, incident_id: int) -> list[dict[str, Any]]:
        return fetch_all(
            """
            SELECT v.id_validation, v.statut, v.date_validation, v.description, v.niveau,
                   u.nom, u.prenom
            FROM validation v
            LEFT JOIN utilisateur u ON u.id = v.id_valide_par
            WHERE v.id_incident = %s
            ORDER BY v.date_validation ASC
            """,
            (incident_id,),
        )