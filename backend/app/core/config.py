import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")


@dataclass(frozen=True)
class Settings:
    db_host: str = os.getenv("DB_HOST", "127.0.0.1")
    db_port: int = int(os.getenv("DB_PORT", "3306"))
    db_user: str = os.getenv("DB_USER", "root")
    db_password: str = os.getenv("DB_PASSWORD", "azer1234")
    db_name: str = os.getenv("DB_NAME", "gestion_hse")

    api_port: int = int(os.getenv("API_PORT", "4002"))
    app_url: str = os.getenv("APP_URL", "http://localhost:3000")
    jwt_secret: str = os.getenv("JWT_SECRET", "change-me-please")
    company_email_domain: str = os.getenv("COMPANY_EMAIL_DOMAIN", "company.com")
    admin_approval_email: str = os.getenv("ADMIN_APPROVAL_EMAIL", "admin@company.local")

    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_secure: bool = os.getenv("SMTP_SECURE", "false").lower() == "true"
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_pass: str = os.getenv("SMTP_PASS", "")
    smtp_from: str = os.getenv("SMTP_FROM", "no-reply@company.local")

    default_declarant_id: int = int(os.getenv("DEFAULT_DECLARANT_ID", "1"))
    default_secteur_id: int = int(os.getenv("DEFAULT_SECTEUR_ID", "1"))


settings = Settings()