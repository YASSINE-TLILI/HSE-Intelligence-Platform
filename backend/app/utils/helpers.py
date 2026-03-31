import re
import secrets
import unicodedata

from app.core.config import settings


def random_token() -> str:
    return secrets.token_hex(32)


def sanitize_email_local_part(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower())
    without_accents = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]", "", without_accents)


def is_reserved_or_invalid_domain(domain: str) -> bool:
    d = (domain or "").strip().lower()
    reserved = {"localhost", "local", "localdomain", "example.com", "example.org", "example.net", "invalid", "test"}
    if not d or d in reserved:
        return True
    if d.endswith(".local") or d.endswith(".localhost") or d.endswith(".invalid") or d.endswith(".test"):
        return True
    if "." not in d:
        return True
    return False


def split_email(email: str | None) -> tuple[str, str] | None:
    if not email or "@" not in email:
        return None
    local, domain = email.rsplit("@", 1)
    local = sanitize_email_local_part(local)
    domain = domain.strip().lower()
    if not local:
        return None
    return local, domain


def normalize_company_email(email: str | None, fallback_local_seed: str) -> str:
    parsed = split_email(email)
    local = sanitize_email_local_part(fallback_local_seed)
    if parsed:
        candidate_local, candidate_domain = parsed
        local = candidate_local or local
        if not is_reserved_or_invalid_domain(candidate_domain):
            return f"{local}@{candidate_domain}"
    if not local:
        local = f"user{secrets.randbelow(99999)}"
    return f"{local}@{settings.company_email_domain}"


def ensure_unique_email(
    user_repo,
    base_email: str,
    current_user_id: int | None = None,
) -> str:
    """Génère un email unique en ajoutant un suffix numérique si nécessaire."""
    local, domain = base_email.split("@", 1)
    for suffix in range(10000):
        candidate_local = local if suffix == 0 else f"{local}{suffix}"
        candidate_email = f"{candidate_local}@{domain}"
        if not user_repo.email_exists(candidate_email, exclude_user_id=current_user_id):
            return candidate_email
    raise ValueError("Impossible de générer un email unique.")


def generate_unique_company_email(user_repo, nom: str, prenom: str) -> str:
    base = (
        f"{sanitize_email_local_part(prenom)}.{sanitize_email_local_part(nom)}"
        or f"user{secrets.randbelow(99999)}"
    )
    for suffix in range(9999):
        local_part = base if suffix == 0 else f"{base}{suffix}"
        email = f"{local_part}@{settings.company_email_domain}"
        if not user_repo.email_exists(email):
            return email
    raise ValueError("Impossible de générer un email entreprise unique.")