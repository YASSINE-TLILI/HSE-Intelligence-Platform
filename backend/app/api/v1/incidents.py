from fastapi import APIRouter, Depends, Response, status

from app.core.deps import get_current_user
from app.schemas.incidents import IncidentCreateRequest, IncidentUpdateRequest
from app.services.incident_service import IncidentService

router = APIRouter()
_service = IncidentService()


@router.get("")
def list_incidents(user=Depends(get_current_user)):
    return _service.list_incidents(user)


@router.get("/reference-data")
def reference_data(_user=Depends(get_current_user)):
    return _service.list_references()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_incident(payload: IncidentCreateRequest, user=Depends(get_current_user)):
    return _service.create_incident(payload, user)


@router.put("/{incident_id}")
def update_incident(incident_id: int, payload: IncidentUpdateRequest, user=Depends(get_current_user)):
    return _service.update_incident(incident_id, payload, user)


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident(incident_id: int, user=Depends(get_current_user)):
    _service.delete_incident(incident_id, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)