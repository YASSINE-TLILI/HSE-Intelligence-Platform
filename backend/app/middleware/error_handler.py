from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import AppException


def register_error_handlers(app: FastAPI) -> None:

    @app.exception_handler(AppException)
    async def app_exception_handler(_request: Request, exc: AppException):
        return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError):
        first_error = exc.errors()[0]["msg"] if exc.errors() else "Requête invalide."
        return JSONResponse(status_code=422, content={"message": first_error})

    @app.exception_handler(Exception)
    async def generic_exception_handler(_request: Request, exc: Exception):
        message = getattr(exc, "args", [None])[0] or str(exc) or "Server error"
        return JSONResponse(status_code=500, content={"message": message})