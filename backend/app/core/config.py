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
    

    # ── SMTP ──────────────────────────────────────────────────────────────────
    # Gmail SSL (port 465) — utiliser un "mot de passe d'application" Google
    smtp_host: str   = os.getenv("SMTP_HOST",   "smtp.gmail.com")
    smtp_port: int   = int(os.getenv("SMTP_PORT", "465"))
    smtp_secure: bool = os.getenv("SMTP_SECURE", "true").lower() == "true"
    smtp_user: str   = os.getenv("SMTP_USER",   "yassinetilili50002003@gmail.com")
    smtp_pass: str   = os.getenv("SMTP_PASS",   "qtnf hymf pnwz cvtl")
    smtp_from: str   = os.getenv("SMTP_FROM",   "yassinetilili50002003@gmail.com")

    # ── Ngrok ─────────────────────────────────────────────────────────────────
    # URL publique ngrok pour les liens dans les emails.
    # Mettre à jour dans .env à chaque redémarrage ngrok (si pas de domaine fixe).
    # Exemple : NGROK_URL=https://xxxx.ngrok-free.app
    ngrok_url: str = os.getenv("NGROK_URL", "http://localhost:5173")

    default_declarant_id: int = int(os.getenv("DEFAULT_DECLARANT_ID", "1"))
    default_secteur_id: int = int(os.getenv("DEFAULT_SECTEUR_ID", "1"))


settings = Settings()