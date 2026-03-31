ROLES = [
    "DECLARANT",
    "RESPONSABLE_SECTEUR",
    "RESPONSABLE_ZONE",
    "RESPONSABLE_HSE",
    "ADMINISTRATEUR",
]

VALIDATION_LEVELS = {
    "SECTEUR": "SECTEUR",
    "ZONE": "ZONE",
    "HSE": "HSE",
}

VALIDATION_ROLE_BY_LEVEL = {
    "SECTEUR": ["RESPONSABLE_SECTEUR", "ADMINISTRATEUR"],
    "ZONE": ["RESPONSABLE_ZONE", "ADMINISTRATEUR"],
    "HSE": ["RESPONSABLE_HSE", "ADMINISTRATEUR"],
}

PRIORITY_TO_GRAVITE = {
    "Basse": "FAIBLE",
    "Moyenne": "MODEREE",
    "Haute": "GRAVE",
    "Critique": "CRITIQUE",
}

GRAVITE_TO_PRIORITY = {
    "FAIBLE": "Basse",
    "MODEREE": "Moyenne",
    "GRAVE": "Haute",
    "CRITIQUE": "Critique",
}

STATUS_TO_DB = {
    "En attente": "DECLARE",
    "En cours": "VALIDE_SECTEUR",
    "Résolu": "CLOTURE",
}