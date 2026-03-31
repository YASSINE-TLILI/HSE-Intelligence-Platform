import base64
import re
import uuid
from pathlib import Path

from app.core.exceptions import ValidationError

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_EXT_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
_MAX_SIZE_BYTES = 10 * 1024 * 1024


def save_data_url_to_file(photo_url: str) -> str:
    """Décode un data-URL base64 et enregistre le fichier. Retourne l'URL publique."""
    match = re.match(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", photo_url, flags=re.DOTALL)
    if not match:
        return photo_url

    mime = match.group(1).lower()
    raw_b64 = re.sub(r"\s+", "", match.group(2))
    ext = _EXT_BY_MIME.get(mime, ".bin")

    try:
        binary = base64.b64decode(raw_b64, validate=True)
    except Exception as exc:
        raise ValidationError("Image base64 invalide.") from exc

    if len(binary) > _MAX_SIZE_BYTES:
        raise ValidationError("Image trop volumineuse (max 10MB).")

    file_name = f"incident_{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / file_name
    file_path.write_bytes(binary)
    return f"/api/uploads/{file_name}"


def cleanup_upload_file(path_or_data: str | None) -> None:
    """Supprime un fichier uploadé si le chemin est une URL d'upload locale."""
    if not path_or_data or not path_or_data.startswith("/api/uploads/"):
        return
    file_name = path_or_data.split("/api/uploads/", 1)[1].strip()
    if not file_name:
        return
    target = UPLOAD_DIR / file_name
    try:
        if target.exists() and target.is_file():
            target.unlink()
    except Exception:
        pass