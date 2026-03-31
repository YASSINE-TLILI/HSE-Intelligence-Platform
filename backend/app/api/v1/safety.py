from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.services.safety_service import SafetyService

router = APIRouter()
_service = SafetyService()


@router.get("/zone/{zone_id}")
def zone_safety(zone_id: int, _user=Depends(get_current_user)):
    return _service.safety_zone(zone_id)


@router.get("/sector/{sector_id}")
def sector_safety(sector_id: int, _user=Depends(get_current_user)):
    return _service.safety_sector(sector_id)


@router.get("/global")
def global_safety(_user=Depends(get_current_user)):
    return _service.safety_global()