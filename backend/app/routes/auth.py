from fastapi import APIRouter, HTTPException, Depends
from app.models.auth import LoginRequest
from app.dependencies import verify_api_key
from app.config import ADMIN_USERNAME, ADMIN_PASSWORD

router = APIRouter()

@router.post("/login")
def login(request: LoginRequest, api_key: str = Depends(verify_api_key)):
    if request.username == ADMIN_USERNAME and request.password == ADMIN_PASSWORD:
        return {"success": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid username or password")
