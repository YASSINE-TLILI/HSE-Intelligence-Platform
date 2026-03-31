# Architecture HSE Backend — Refactoring

## Nouvelle structure

```
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py          # Agrégation de tous les routers
│   │       ├── actions.py
│   │       ├── admin.py
│   │       ├── ai.py
│   │       ├── auth.py
│   │       ├── health.py
│   │       ├── incidents.py
│   │       ├── notifications.py
│   │       ├── reports.py
│   │       ├── safety.py
│   │       └── validations.py
│   ├── core/
│   │   ├── config.py                # Settings (inchangé)
│   │   ├── constants.py             # Constantes métier (inchangé)
│   │   ├── database.py              # Connexion DB (inchangé)
│   │   ├── deps.py                  # Dépendances FastAPI (utilise UserRepository)
│   │   ├── exceptions.py            # ★ NOUVEAU — exceptions métier centralisées
│   │   └── security.py              # JWT / bcrypt (inchangé)
│   ├── middleware/                  # ★ NOUVEAU — séparé de main.py
│   │   ├── cors.py
│   │   ├── error_handler.py         # Convertit AppException → JSONResponse
│   │   └── logging.py               # Middleware HTTP timing
│   ├── schemas/                     # ★ NOUVEAU — remplace app/models/
│   │   ├── ai.py
│   │   ├── auth.py
│   │   ├── actions.py
│   │   ├── incidents.py
│   │   └── reports.py
│   ├── repositories/                # ★ NOUVEAU — couche accès données
│   │   ├── action_repository.py
│   │   ├── auth_repository.py
│   │   ├── incident_repository.py
│   │   ├── notification_repository.py
│   │   ├── report_repository.py
│   │   ├── user_repository.py
│   │   └── validation_repository.py
│   ├── services/                    # Logique métier pure (sans SQL)
│   │   ├── action_service.py        # ★ NOUVEAU (extrait de workflow_service)
│   │   ├── ai_service.py
│   │   ├── auth_service.py
│   │   ├── bootstrap_service.py
│   │   ├── incident_service.py
│   │   ├── mail_service.py
│   │   ├── notification_service.py
│   │   ├── report_service.py        # ★ NOUVEAU (extrait de workflow_service)
│   │   ├── safety_service.py        # ★ NOUVEAU (extrait de workflow_service)
│   │   ├── validation_service.py
│   │   └── workflow_service.py      # Orchestration validation uniquement
│   └── utils/
│       ├── file_utils.py            # ★ NOUVEAU — upload / cleanup fichiers
│       ├── helpers.py               # ★ NOUVEAU — email, token (extrait de common_service)
│       └── mappers.py               # (inchangé)
├── uploads/
├── main.py                          # Application slim
├── run.py
└── requirements.txt
```

## Améliorations principales

### 1. Pattern Repository (couche `repositories/`)
Avant : les services contenaient du SQL brut inline, mélangé à la logique métier.  
Après : tout le SQL vit dans les repositories. Les services ne font qu'appeler des méthodes nommées (`find_by_id`, `create`, `update_status`...).

**Bénéfices :**
- Services testables unitairement (mock du repository)
- SQL centralisé et réutilisable
- Remplacement possible de l'ORM sans toucher aux services

### 2. Exceptions métier centralisées (`core/exceptions.py`)
Avant : `raise HTTPException(status_code=404, detail="...")` éparpillé dans 15 fichiers.  
Après : `raise NotFoundError("...")` dans les services. La couche middleware convertit en réponse HTTP.

**Bénéfices :**
- Services découplés de FastAPI
- Un seul endroit pour modifier les codes de réponse
- Erreurs typées, faciles à attraper dans les tests

### 3. Middleware isolé (`middleware/`)
Avant : CORS, error handlers et logging configurés dans `main.py`.  
Après : chaque middleware dans son module, enregistré via `register_*()`.

### 4. Schemas séparés par domaine (`schemas/`)
Avant : `models/auth.py` et `models/incidents.py` (mélange incidents/actions/reports).  
Après : `schemas/auth.py`, `schemas/incidents.py`, `schemas/actions.py`, `schemas/reports.py`, `schemas/ai.py`.

### 5. Décomposition de `workflow_service.py`
Avant : un fichier de 500+ lignes mélangeant actions correctives, sécurité, rapports et workflow.  
Après :
- `action_service.py` — actions correctives
- `safety_service.py` — scores de sécurité
- `report_service.py` — génération et export de rapports
- `workflow_service.py` — uniquement l'orchestration de validation d'incidents

### 6. Utils spécialisés
- `utils/helpers.py` — utilitaires email/token (extraits de `common_service.py`)
- `utils/file_utils.py` — gestion des fichiers uploadés (extrait de `incident_service.py`)
- `utils/mappers.py` — mapping DB → API (inchangé)

## Principe de flux d'une requête

```
HTTP Request
    → Middleware (logging, CORS)
    → Router (app/api/v1/*.py)         # Validation Pydantic, dépendances auth
    → Service (app/services/*.py)       # Logique métier, règles business
    → Repository (app/repositories/*.py) # Requêtes SQL uniquement
    → Database (app/core/database.py)
```

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=gestion_hse
API_PORT=4002
APP_URL=http://localhost:3000
JWT_SECRET=change-me-in-production
COMPANY_EMAIL_DOMAIN=company.com
ADMIN_APPROVAL_EMAIL=admin@company.local
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@company.local
```

## Lancement

```bash
pip install -r requirements.txt
python run.py
# ou
uvicorn main:app --host 0.0.0.0 --port 4002 --reload
```

Swagger UI disponible sur : `http://localhost:4002/swagger`