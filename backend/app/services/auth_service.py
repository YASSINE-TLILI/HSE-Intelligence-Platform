from datetime import datetime, timedelta

from app.core.config import settings
from app.core.constants import ROLES
from app.core.exceptions import ConflictError, NotFoundError, ValidationError, ForbiddenError
from app.core.security import hash_password, is_bcrypt_hash, verify_password
from app.repositories.auth_repository import AuthRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    AdminReviewDecisionRequest,
    LoginRequest,
    RegisterRequest,
    SetupPasswordRequest,
    UpdateMeRequest,
)
from app.utils.helpers import (
    ensure_unique_email,
    generate_unique_company_email,
    normalize_company_email,
    random_token,
    sanitize_email_local_part,
)

_auth_repo = AuthRepository()
_user_repo = UserRepository()



class AuthService:

    def register_request(self, payload: RegisterRequest) -> dict:
        if len(payload.mot_passe) < 8:
            raise ValidationError("Le mot de passe doit contenir au moins 8 caractères.")
        
        if payload.mot_passe != payload.confirm_mot_passe:
            raise ValidationError("Les mots de passe ne correspondent pas.")
    
        if payload.role not in ROLES:
            raise ValidationError("Rôle invalide.")
        
        if payload.role in ["DECLARANT", "RESPONSABLE_SECTEUR"] and not payload.id_secteur:
           raise ValidationError("Secteur obligatoire.")

        if payload.role == "RESPONSABLE_ZONE" and not payload.id_zone:
           raise ValidationError("Zone obligatoire.")

        if payload.role == "RESPONSABLE_HSE" and not payload.id_entite:
           raise ValidationError("Entité obligatoire.")

        if payload.role == "ADMINISTRATEUR" and not payload.id_site:
           raise ValidationError("Site obligatoire.")
    
        existing = _auth_repo.find_pending_request_by_email(payload.personalEmail)
        if existing:
            raise ConflictError("Une demande existe déjà pour cet email.")
   
        password_hash = hash_password(payload.mot_passe)

        _user_repo.create_user(
            nom=payload.nom,
            prenom=payload.prenom,
            email=payload.personalEmail,
            telephone=payload.telephone,
            adresse=payload.adresse,
            date_naissance=payload.dateNaissance,
            mot_passe=password_hash,
            role=payload.role,
            active=1,
            id_secteur=payload.id_secteur,
            id_zone=payload.id_zone,
            id_entite=payload.id_entite,
            id_site=payload.id_site, 
        )
        return {"message": "Inscription réussie. Vous pouvez maintenant vous connecter."}

        
    
    def get_admin_review(self, token: str) -> dict:
        row = _auth_repo.find_request_by_token(token)
        if not row:
            raise NotFoundError("Demande introuvable.")
        return {
            "idRequest": row["id_request"],
            "nom": row["nom"],
            "prenom": row["prenom"],
            "personalEmail": row["personal_email"],
            "telephone": row["telephone"],
            "adresse": row["adresse"],
            "dateNaissance": str(row["date_naissance"]) if row["date_naissance"] else None,
            "status": row["status"],
            "createdAt": str(row["created_at"]),
        }

   
    def setup_password(self, payload: SetupPasswordRequest) -> dict:
        if len(payload.password) < 8:
            raise ValidationError("Le mot de passe doit contenir au moins 8 caractères.")

        row = _auth_repo.find_setup_token(payload.token)
        if not row:
            raise NotFoundError("Token de configuration invalide.")
        if row["used_at"] is not None:
            raise ValidationError("Ce token a déjà été utilisé.")
        if row["expires_at"] and row["expires_at"] < datetime.utcnow():
            raise ValidationError("Ce token a expiré.")
        if not verify_password(payload.pin, row["pin_hash"]):
            raise ValidationError("PIN invalide.")

        password_hash = hash_password(payload.password)
        _user_repo.update_password(row["id_user"], password_hash)
        _user_repo.activate(row["id_user"])
        _auth_repo.mark_token_used(row["id_token"])
        _auth_repo.complete_request(row["id_request"])
        return {"message": "Mot de passe défini avec succès."}

    def login(self, payload: LoginRequest) -> dict:
        user = _user_repo.find_by_email(payload.email)
        if not user:
            raise ValidationError("Identifiants invalides.")
        if int(user.get("active") or 0) != 1:
            raise ForbiddenError("Compte inactif.")

        stored_password = user.get("mot_passe") or ""
        password_ok = verify_password(payload.password, stored_password)

        # Support mot de passe en clair legacy — upgrade automatique vers bcrypt
        if not password_ok and stored_password and not is_bcrypt_hash(stored_password):
            password_ok = payload.password == stored_password
            if password_ok:
                _user_repo.update_password(user["id"], hash_password(payload.password))

        if not password_ok:
            raise ValidationError("Identifiants invalides.")

        return {
            "user": {
                "id": user["id"],
                "nom": user["nom"],
                "prenom": user["prenom"],
                "email": user["email"],
                "role": user["role"],
                "active": user["active"],
            }
        }
    
    
    def logout(self, token: str | None) -> dict:
        if token:
            _auth_repo.revoke_token(token)
        return {"message": "Déconnexion réussie."}

    def get_me(self, user: dict) -> dict:
        return {
            "id": user["id"],
            "nom": user["nom"],
            "prenom": user["prenom"],
            "email": user["email"],
            "role": user["role"],
            "active": user["active"],
        }
    def update_me(self, user: dict, payload: UpdateMeRequest) -> dict:
        final_nom = payload.nom or user["nom"]
        final_prenom = payload.prenom or user["prenom"]
        final_email_input = payload.email or user["email"]
        fallback_local = (
            f"{sanitize_email_local_part(final_prenom)}."
            f"{sanitize_email_local_part(final_nom)}"
        )
        final_email = normalize_company_email(final_email_input, fallback_local)
        final_email = ensure_unique_email(_user_repo, final_email, current_user_id=int(user["id"]))

        _user_repo.update_profile(int(user["id"]), final_nom, final_prenom, final_email)
        return _user_repo.find_by_id(int(user["id"]))