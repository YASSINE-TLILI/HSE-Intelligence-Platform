from sqlite3 import Cursor
from typing import Any

from app.core.database import db_cursor, fetch_one


class UserRepository:
    """Accès aux données pour la table utilisateur."""

    def find_by_id(self, user_id: int) -> dict[str, Any] | None:
        return fetch_one(
            "SELECT id, nom, prenom, email, role, active, id_site FROM utilisateur WHERE id = %s LIMIT 1",
            (user_id,),
        )

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        return fetch_one(
            "SELECT id, nom, prenom, email, role, active, mot_passe FROM utilisateur WHERE email = %s LIMIT 1",
            (email,),
        )

    def find_all(self) -> list[dict[str, Any]]:
        from app.core.database import fetch_all
        return fetch_all("SELECT id, nom, prenom, email, role, active, mot_passe FROM utilisateur")

    def find_by_roles(self, roles: list[str]) -> list[dict[str, Any]]:
        from app.core.database import fetch_all
        placeholders = ",".join(["%s"] * len(roles))
        return fetch_all(
            f"SELECT id FROM utilisateur WHERE role IN ({placeholders}) AND active = 1",
            tuple(roles),
        )
    def create_user(
        self,
        nom, prenom, email, telephone, adresse,
        date_naissance, mot_passe, role, active,
        id_secteur=None, id_zone=None, id_entite=None, id_site=None
        ):
        with db_cursor() as (_conn, cursor):
         cursor.execute(
            """
            INSERT INTO utilisateur 
            (nom, prenom, email, telephone, adresse, date_naissance, mot_passe, role, active, id_secteur, id_zone, id_entite, id_site, date_creation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """,
            (
                nom, prenom, email, telephone, adresse,
                date_naissance, mot_passe, role, active,
                id_secteur, id_zone, id_entite, id_site
            )
        )

    def email_exists(self, email: str, exclude_user_id: int | None = None) -> bool:
        import pymysql
        from app.core.database import get_connection
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                if exclude_user_id is None:
                    cursor.execute(
                        "SELECT id FROM utilisateur WHERE LOWER(email) = LOWER(%s) LIMIT 1",
                        (email,),
                    )
                else:
                    cursor.execute(
                        "SELECT id FROM utilisateur WHERE LOWER(email) = LOWER(%s) AND id <> %s LIMIT 1",
                        (email, exclude_user_id),
                    )
                return cursor.fetchone() is not None
        finally:
            conn.close()

        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "INSERT INTO utilisateur (nom, prenom, email, role, mot_passe, active) VALUES (%s, %s, %s, %s, %s, 0)",
                (nom, prenom, email, role, password_hash),
            )
            return int(cursor.lastrowid)

    def update_password(self, user_id: int, password_hash: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute("UPDATE utilisateur SET mot_passe = %s WHERE id = %s", (password_hash, user_id))

    def activate(self, user_id: int) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute("UPDATE utilisateur SET active = 1 WHERE id = %s", (user_id,))

    def update_profile(self, user_id: int, nom: str, prenom: str, email: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE utilisateur SET nom = %s, prenom = %s, email = %s WHERE id = %s",
                (nom, prenom, email, user_id),
            )

    def update_email(self, user_id: int, email: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute("UPDATE utilisateur SET email = %s WHERE id = %s", (email, user_id))