# app/repositories/action_repository.py

from typing import Any

from app.core.database import db_cursor, fetch_all, fetch_one


class ActionRepository:
    """Accès aux données pour la table action_corrective."""

    def find_by_id(self, action_id: int) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT
                a.id_action,
                a.description,
                a.date_debut,
                a.date_fin_prevue,
                a.date_cloture,
                a.statut,
                a.preuve_photo,
                a.id_incident,
                a.id_responsable_secteur,
                CONCAT(COALESCE(u.prenom, ''), ' ', COALESCE(u.nom, '')) AS nom_responsable
            FROM action_corrective a
            LEFT JOIN utilisateur u ON u.id = a.id_responsable_secteur
            WHERE a.id_action = %s
            LIMIT 1
            """,
            (action_id,),
        )

    def find_by_incident(self, incident_id: int) -> list[dict[str, Any]]:
        """Retourne toutes les actions correctives liées à un incident."""
        return fetch_all(
            """
            SELECT
                a.id_action,
                a.description,
                a.date_debut,
                a.date_fin_prevue,
                a.date_cloture,
                a.statut,
                a.preuve_photo,
                a.id_incident,
                a.id_responsable_secteur,
                CONCAT(COALESCE(u.prenom, ''), ' ', COALESCE(u.nom, '')) AS nom_responsable
            FROM action_corrective a
            LEFT JOIN utilisateur u ON u.id = a.id_responsable_secteur
            WHERE a.id_incident = %s
            ORDER BY a.date_debut ASC
            """,
            (incident_id,),
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