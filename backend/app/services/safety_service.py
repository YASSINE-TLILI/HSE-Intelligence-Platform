from app.repositories.incident_repository import IncidentRepository

_repo = IncidentRepository()


class SafetyService:

    def _compute_score(self, rows: list[dict]) -> dict:
        count = len(rows)
        avg_risk = sum(float(r.get("risk_score") or 0) for r in rows) / count if count else 0
        return {"incidents": count, "avgRisk": avg_risk, "score": round(max(0, 100 - avg_risk), 2)}

    def safety_zone(self, zone_id: int) -> dict:
        rows = _repo.find_by_risk_in_zone(zone_id)
        result = self._compute_score(rows)
        return {"zoneId": zone_id, **result}

    def safety_sector(self, sector_id: int) -> dict:
        rows = _repo.find_by_risk_in_sector(sector_id)
        result = self._compute_score(rows)
        return {"sectorId": sector_id, **result}

    def safety_global(self) -> dict:
        rows = _repo.find_all_risk_scores()
        result = self._compute_score(rows)
        return {"globalScore": result["score"], **result, "generatedBy": "deterministic-formula"}