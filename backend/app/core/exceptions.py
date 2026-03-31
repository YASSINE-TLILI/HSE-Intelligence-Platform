

class AppException(Exception):
   

    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class NotFoundError(AppException):
    def __init__(self, detail: str = "Ressource introuvable."):
        super().__init__(detail, status_code=404)


class UnauthorizedError(AppException):
    def __init__(self, detail: str = "Utilisateur non connecté."):
        super().__init__(detail, status_code=401)


class ForbiddenError(AppException):
    def __init__(self, detail: str = "Accès refusé."):
        super().__init__(detail, status_code=403)


class ConflictError(AppException):
    def __init__(self, detail: str = "Conflit de données."):
        super().__init__(detail, status_code=409)


class ValidationError(AppException):
    def __init__(self, detail: str = "Données invalides."):
        super().__init__(detail, status_code=400)