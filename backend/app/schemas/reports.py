from pydantic import BaseModel


class ReportGenerateRequest(BaseModel):
    dateStart: str
    dateEnd: str
    scopeType: str = "GLOBAL"
    scopeId: int | None = None