import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f" Server running on: http://127.0.0.1:{settings.api_port}/api")
    print(f" Docs: http://127.0.0.1:{settings.api_port}/swagger")
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=settings.api_port,
        reload=False
    )