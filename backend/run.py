import uvicorn
from app.core.config import settings
import bcrypt
if __name__ == "__main__":
    print(f" Server running on: http://127.0.0.1:{settings.api_port}/api")
    print(f" Docs: http://127.0.0.1:{settings.api_port}/swagger")
    

    password = "azer1234"

# hash du mot de passe
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    print(hashed_password.decode())
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=settings.api_port,
        reload=False
    )