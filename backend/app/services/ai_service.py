class AIService:

    def analyze_description(self, description: str | None) -> dict:
        txt = (description or "").lower()
        factors: list[str] = []
        if "fuite" in txt or "chimique" in txt:
            factors.append("EXPOSITION_CHIMIQUE")
        if "incendie" in txt or "feu" in txt:
            factors.append("RISQUE_INCENDIE")
        if "chute" in txt:
            factors.append("RISQUE_CHUTE")
        predicted_level = "CRITIQUE" if len(factors) >= 2 else ("GRAVE" if factors else "MODEREE")
        return {
            "factors": factors,
            "predictedLevel": predicted_level,
            "confidence": 0.82 if factors else 0.64,
            "recommendations": [
                "Sécuriser immédiatement la zone",
                "Informer le responsable de secteur",
                "Documenter les preuves photo",
            ],
        }

    def analyze_image(self) -> dict:
        return {
            "findings": ["PPE_MISSING", "ZONE_OBSTRUCTION"],
            "confidence": 0.78,
            "recommendedActions": [
                "Vérifier le port des EPI",
                "Dégager la zone de circulation",
            ],
        }

    def safety_score(self) -> dict:
        return {
            "globalScore": 74,
            "topZonesAtRisk": ["Zone Production A", "Zone Stockage Nord"],
            "trend": "stable",
            "explanation": "Score déterministe provisoire en attente du modèle IA final.",
        }