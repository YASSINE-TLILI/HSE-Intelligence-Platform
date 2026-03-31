from typing import Any

from app.core.database import db_cursor, fetch_one


class ActionRepository:
    """Accès aux données pour la table action_corrective."""

    def find_by_id(self, action_id: int) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT id_action, description, date_debut, date_fin_prevue, date_cloture,
                   statut, preuve_photo, id_incident, id_responsable_secteur
            FROM action_corrective WHERE id_action = %s LIMIT 1
            """,
            (action_id,),
        )

    def create(
        self,
        incident_id: int,
        description: str,
        date_debut: str,
        date_fin_prevue: str,
        responsible_id: int,
    ) -> int:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                INSERT INTO action_corrective
                  (description, date_debut, date_fin_prevue, statut, id_incident, id_responsable_secteur)
                VALUES (%s, %s, %s, 'EN_COURS', %s, %s)
                """,
                (description, date_debut, date_fin_prevue, incident_id, responsible_id),
            )
            return int(cursor.lastrowid)

    def validate(self, action_id: int) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE action_corrective SET statut = 'VALIDEE' WHERE id_action = %s",
                (action_id,),
            )

    def close(self, action_id: int, preuve_photo: str | None) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                UPDATE action_corrective
                SET statut = 'CLOTUREE', date_cloture = CURDATE(), preuve_photo = %s
                WHERE id_action = %s
                """,
                (preuve_photo, action_id),
            )