from app.core.database import db_cursor
from app.core.security import hash_password, is_bcrypt_hash
from app.repositories.auth_repository import AuthRepository
from app.repositories.user_repository import UserRepository
from app.utils.helpers import (
    ensure_unique_email,
    normalize_company_email,
    sanitize_email_local_part,
)

_auth_repo = AuthRepository()
_user_repo = UserRepository()


class BootstrapService:
    """Migrations et initialisations exécutées au démarrage de l'application."""

    def ensure_auth_tables(self) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS registration_request (
                  id_request INT AUTO_INCREMENT PRIMARY KEY,
                  nom VARCHAR(100) NOT NULL,
                  prenom VARCHAR(100) NOT NULL,
                  personal_email VARCHAR(150) NOT NULL,
                  telephone VARCHAR(20) DEFAULT NULL,
                  adresse VARCHAR(255) DEFAULT NULL,
                  date_naissance DATE DEFAULT NULL,
                  pin_hash VARCHAR(255) NOT NULL,
                  status ENUM('PENDING','APPROVED','DECLINED','COMPLETED') NOT NULL DEFAULT 'PENDING',
                  admin_token VARCHAR(100) NOT NULL UNIQUE,
                  assigned_role ENUM('DECLARANT','RESPONSABLE_SECTEUR','RESPONSABLE_ZONE','RESPONSABLE_HSE','ADMINISTRATEUR') DEFAULT NULL,
                  company_email VARCHAR(150) DEFAULT NULL,
                  decision_note TEXT DEFAULT NULL,
                  id_user INT DEFAULT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  reviewed_at TIMESTAMP NULL DEFAULT NULL,
                  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  INDEX idx_registration_email (personal_email),
                  CONSTRAINT fk_registration_user FOREIGN KEY (id_user) REFERENCES utilisateur(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS password_setup_token (
                  id_token INT AUTO_INCREMENT PRIMARY KEY,
                  id_request INT NOT NULL,
                  id_user INT NOT NULL,
                  setup_token VARCHAR(100) NOT NULL UNIQUE,
                  expires_at TIMESTAMP NOT NULL,
                  used_at TIMESTAMP NULL DEFAULT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  INDEX idx_setup_token_expires (expires_at),
                  CONSTRAINT fk_setup_request FOREIGN KEY (id_request) REFERENCES registration_request(id_request) ON DELETE CASCADE,
                  CONSTRAINT fk_setup_user FOREIGN KEY (id_user) REFERENCES utilisateur(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS revoked_token (
                  id_revoked INT AUTO_INCREMENT PRIMARY KEY,
                  token TEXT NOT NULL,
                  revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS report_hse (
                  id_report INT AUTO_INCREMENT PRIMARY KEY,
                  periode_debut DATE NOT NULL,
                  periode_fin DATE NOT NULL,
                  scope_type ENUM('GLOBAL','ZONE','SECTEUR') NOT NULL DEFAULT 'GLOBAL',
                  scope_id INT DEFAULT NULL,
                  contenu_json LONGTEXT NOT NULL,
                  genere_par INT DEFAULT NULL,
                  date_generation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (genere_par) REFERENCES utilisateur(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
                """
            )
            # Colonne photo LONGTEXT
            cursor.execute(
                "SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'photo'"
            )
            if int((cursor.fetchone() or {}).get("c") or 0) > 0:
                cursor.execute("ALTER TABLE photo MODIFY COLUMN chemin_fichier LONGTEXT NOT NULL")

            # Colonne id_entite sur incident
            cursor.execute(
                "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incident' AND COLUMN_NAME = 'id_entite'"
            )
            if int((cursor.fetchone() or {}).get("c") or 0) == 0:
                cursor.execute("ALTER TABLE incident ADD COLUMN id_entite INT NULL AFTER id_secteur")
                cursor.execute(
                    """
                    UPDATE incident i
                    INNER JOIN secteur s ON s.id_secteur = i.id_secteur
                    INNER JOIN zone z ON z.id_zone = s.id_zone
                    SET i.id_entite = z.id_entite
                    WHERE i.id_entite IS NULL
                    """
                )
                cursor.execute("ALTER TABLE incident ADD INDEX idx_incident_entite (id_entite)")

    def migrate_user_emails_and_passwords(self) -> dict:
        updated_emails = 0
        updated_passwords = 0

        users = _user_repo.find_all()
        for user in users:
            user_id = int(user["id"])
            prenom = user.get("prenom") or ""
            nom = user.get("nom") or ""
            fallback_local = f"{sanitize_email_local_part(prenom)}.{sanitize_email_local_part(nom)}"
            normalized = normalize_company_email(user.get("email"), fallback_local)
            unique_email = ensure_unique_email(_user_repo, normalized, current_user_id=user_id)

            if (user.get("email") or "").strip().lower() != unique_email.lower():
                _user_repo.update_email(user_id, unique_email)
                updated_emails += 1

            raw_password = user.get("mot_passe") or ""
            if raw_password and not is_bcrypt_hash(raw_password):
                _user_repo.update_password(user_id, hash_password(raw_password))
                updated_passwords += 1

        # Normaliser aussi les emails des demandes d'inscription
        requests = _auth_repo.find_all_requests_with_company_email()
        for req in requests:
            rid = int(req["id_request"])
            normalized = normalize_company_email(req.get("company_email"), f"user{rid}")
            if (req.get("company_email") or "").strip().lower() != normalized.lower():
                _auth_repo.update_request_company_email(rid, normalized)

        return {"updatedEmails": updated_emails, "updatedPasswords": updated_passwords}