from datetime import datetime
from typing import Any

from app.core.database import db_cursor, fetch_one


class AuthRepository:
    """Accès aux données pour registration_request, password_setup_token, revoked_token."""

    def find_pending_request_by_email(self, personal_email: str) -> dict[str, Any] | None:
        return fetch_one(
            'SELECT id_request FROM registration_request WHERE personal_email = %s AND status = "PENDING" LIMIT 1',
            (personal_email,),
        )

    def create_registration_request(
        self,
        nom: str, prenom: str, personal_email: str,
        telephone: str, adresse: str, date_naissance: str | None,
        pin_hash: str, admin_token: str,
    ) -> int:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                INSERT INTO registration_request
                  (nom, prenom, personal_email, telephone, adresse, date_naissance, pin_hash, admin_token)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (nom, prenom, personal_email, telephone, adresse, date_naissance, pin_hash, admin_token),
            )
            return int(cursor.lastrowid)

    def find_request_by_token(self, admin_token: str) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT id_request, nom, prenom, personal_email, telephone, adresse,
                   date_naissance, status, created_at
            FROM registration_request WHERE admin_token = %s LIMIT 1
            """,
            (admin_token,),
        )

    def find_request_by_token_with_status(self, admin_token: str) -> dict[str, Any] | None:
        return fetch_one(
            "SELECT id_request, nom, prenom, personal_email, status FROM registration_request WHERE admin_token = %s LIMIT 1",
            (admin_token,),
        )

    def decline_request(self, id_request: int, note: str | None) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE registration_request SET status = 'DECLINED', decision_note = %s, reviewed_at = NOW() WHERE id_request = %s",
                (note, id_request),
            )

    def approve_request(self, id_request: int, role: str, company_email: str, note: str | None, user_id: int) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                UPDATE registration_request
                SET status = 'APPROVED', assigned_role = %s, company_email = %s,
                    decision_note = %s, id_user = %s, reviewed_at = NOW()
                WHERE id_request = %s
                """,
                (role, company_email, note, user_id, id_request),
            )

    def complete_request(self, id_request: int) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE registration_request SET status = 'COMPLETED' WHERE id_request = %s",
                (id_request,),
            )

    def create_setup_token(self, id_request: int, user_id: int, setup_token: str, expires_at: datetime) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "INSERT INTO password_setup_token (id_request, id_user, setup_token, expires_at) VALUES (%s, %s, %s, %s)",
                (id_request, user_id, setup_token, expires_at),
            )

    def find_setup_token(self, token: str) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT pst.id_token, pst.id_user, pst.id_request, pst.expires_at, pst.used_at, rr.pin_hash
            FROM password_setup_token pst
            INNER JOIN registration_request rr ON rr.id_request = pst.id_request
            WHERE pst.setup_token = %s LIMIT 1
            """,
            (token,),
        )

    def mark_token_used(self, id_token: int) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute("UPDATE password_setup_token SET used_at = NOW() WHERE id_token = %s", (id_token,))

    def revoke_token(self, token: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute("INSERT INTO revoked_token (token) VALUES (%s)", (token,))

    def find_all_requests_with_company_email(self) -> list[dict]:
        from app.core.database import fetch_all
        return fetch_all(
            "SELECT id_request, company_email FROM registration_request WHERE company_email IS NOT NULL AND company_email <> ''"
        )

    def update_request_company_email(self, id_request: int, email: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE registration_request SET company_email = %s WHERE id_request = %s",
                (email, id_request),
            )