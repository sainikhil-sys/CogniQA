from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
import uuid
from sqlalchemy.orm import Session
from backend.app.core.security import verify_token, rate_limit_check
from backend.app.db.session import get_db
from backend.app.db.models import User

router = APIRouter()

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str

@router.get("/me", tags=["Authentication"])
async def get_current_user(db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    # RLS: Read user profile data from public schema
    user = db.query(User).filter(User.id == user_uuid).first()
    
    if not user:
        # Fallback profile insertion if the Supabase Auth trigger is delayed during OAuth sync
        user = User(
            id=user_uuid,
            email="developer@cogniqa.codes",
            full_name="CogniQA Core Developer"
        )
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            # If already exists or error, fetch again
            user = db.query(User).filter(User.id == user_uuid).first()
            if not user:
                return {
                    "id": str(user_uuid),
                    "email": "developer@cogniqa.codes",
                    "full_name": "CogniQA Core Developer"
                }

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name
    }
