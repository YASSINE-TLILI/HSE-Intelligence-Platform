ROLES = [
    "DECLARANT",
    "RESPONSABLE_SECTEUR",
    "RESPONSABLE_ZONE",
    "RESPONSABLE_ENTITE",
    "ADMINISTRATEUR",
]

VALIDATION_LEVELS = {
    "SECTEUR": "SECTEUR",
    "ZONE": "ZONE",
    "ENTITE": "ENTITE",
}

WORKFLOW_TRANSITIONS = {
    "SECTEUR": {
        "required_status": [
            "En attente",
            "EN_ATTENTE_VALIDATION_SECTEUR"
        ],
        "on_validate": "VALIDE_SECTEUR",
        "on_reject": "REJETE",
        "next_waiting": "EN_ATTENTE_VALIDATION_ZONE",
    },

    "ZONE": {
        "required_status": [
            "VALIDE_SECTEUR",
            "EN_ATTENTE_VALIDATION_ZONE"
        ],
        "on_validate": "VALIDE_ZONE",
        "on_reject": "REJETE",
        "next_waiting": "EN_ATTENTE_VALIDATION_ENTITE",
    },

    "ENTITE": {
        "required_status": [
            "VALIDE_ZONE",
            "EN_ATTENTE_VALIDATION_ENTITE"
        ],
        "on_validate": "VALIDE_ENTITE",
        "on_reject": "REJETE",
        "next_waiting": "CLOTURE",
    },
}
VALIDATION_ROLE_BY_LEVEL = {
    "SECTEUR": ["RESPONSABLE_SECTEUR", "ADMINISTRATEUR"],
    "ZONE": ["RESPONSABLE_ZONE", "ADMINISTRATEUR"],
    "ENTITE": ["RESPONSABLE_ENTITE", "ADMINISTRATEUR"],
}

PRIORITY_TO_GRAVITE = {
    "Basse": "FAIBLE",
    "Moyenne": "MODEREE",
    "Haute": "GRAVE",
    "Critique": "CRITIQUE",
}

STATUTS_EN_COURS = [
    "En attente",
    "EN_ATTENTE_VALIDATION_SECTEUR",
    "VALIDE_SECTEUR",
    "EN_ATTENTE_VALIDATION_ZONE",
    "VALIDE_ZONE",
    "EN_ATTENTE_VALIDATION_ENTITE",
    "VALIDE_ENTITE",
]

STATUTS_RESOLUS = [
    "CLOTURE",
    "REJETE"
]
GRAVITE_TO_PRIORITY = {
    "FAIBLE": "Basse",
    "MODEREE": "Moyenne",
    "GRAVE": "Haute",
    "CRITIQUE": "Critique",
}
# TYPES NOTIFICATION
NOUVEL_INCIDENT = "NOUVEL_INCIDENT"
CHANGEMENT_STATUT = "CHANGEMENT_STATUT"
ESCALADE = "ESCALADE"

STATUS_TO_DB = {
    "En attente": "En attente",
    "Résolu": "CLOTURE",
}

PENDING_STATUSES_BY_LEVEL = {
    "SECTEUR": ["En attente", "EN_ATTENTE_VALIDATION_SECTEUR"],
    "ENTITE":  ["VALIDE_SECTEUR", "EN_ATTENTE_VALIDATION_ENTITE"],
    "ZONE":    ["VALIDE_ENTITE",  "EN_ATTENTE_VALIDATION_ZONE"],
}