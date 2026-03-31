from io import BytesIO

from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse

from app.core.deps import get_current_user, require_roles
from app.schemas.reports import ReportGenerateRequest
from app.services.report_service import ReportService

router = APIRouter()
_service = ReportService()


@router.post("/generate", status_code=201)
def generate(
    payload: ReportGenerateRequest,
    user=Depends(require_roles("RESPONSABLE_HSE", "RESPONSABLE_ZONE", "ADMINISTRATEUR")),
):
    return _service.generate_report(
        date_start=payload.dateStart,
        date_end=payload.dateEnd,
        scope_type=payload.scopeType,
        scope_id=payload.scopeId,
        user_id=int(user["id"]),
    )


@router.get("")
def list_all(_user=Depends(get_current_user)):
    return _service.list_reports()


@router.get("/{report_id}")
def read_report(report_id: int, _user=Depends(get_current_user)):
    return _service.get_report(report_id)


@router.get("/{report_id}/pdf")
def report_pdf(report_id: int, _user=Depends(get_current_user)):
    data = _service.get_report_pdf_bytes(report_id)
    headers = {"Content-Disposition": f'inline; filename="rapport_hse_{report_id}.pdf"'}
    return Response(content=data, media_type="application/pdf", headers=headers)


@router.get("/{report_id}/xlsx")
def report_xlsx(report_id: int, _user=Depends(get_current_user)):
    data = _service.get_report_excel_bytes(report_id)
    headers = {"Content-Disposition": f'attachment; filename="rapport_hse_{report_id}.xlsx"'}
    return StreamingResponse(
        BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )