from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import settings
from app.middleware.cors import register_cors
from app.middleware.error_handler import register_error_handlers
from app.middleware.logging import register_logging
from app.services.bootstrap_service import BootstrapService

app = FastAPI(
    title="HSE Gestion API",
    version="1.0.0",
    description="API for HSE incidents and registration workflow.",
    docs_url="/swagger",
    openapi_url="/api/openapi.json",
)

register_cors(app, settings)
register_logging(app)
register_error_handlers(app)

app.include_router(api_router)

uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.on_event("startup")
def startup_event() -> None:
    bootstrap = BootstrapService()
    bootstrap.ensure_auth_tables()
    result = bootstrap.migrate_user_emails_and_passwords()
    print(f"Startup migration: emails={result['updatedEmails']} passwords={result['updatedPasswords']}")