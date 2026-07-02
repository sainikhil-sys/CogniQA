from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
import uuid
import httpx
from sqlalchemy.orm import Session
from backend.app.core.security import verify_token, rate_limit_check
from backend.app.db.session import get_db
from backend.app.db.models import User
from backend.app.core.config import settings

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

@router.post("/register", response_model=TokenResponse, tags=["Authentication"])
async def register_user(user_in: UserRegister, request: Request, db: Session = Depends(get_db)):
    rate_limit_check(request, limit=10)
    
    url = f"{settings.SUPABASE_URL}/auth/v1/signup"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": user_in.email,
        "password": user_in.password,
        "data": {
            "full_name": user_in.full_name
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                # Access token and user ID from Supabase response
                access_token = data.get("access_token")
                user_id = data.get("user", {}).get("id")
                
                if not access_token or not user_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Registration succeeded, but no session token was generated."
                    )
                
                # Check/insert profile in public schema to avoid trigger latency issues
                user_uuid = uuid.UUID(user_id)
                db_user = db.query(User).filter(User.id == user_uuid).first()
                if not db_user:
                    db_user = User(
                        id=user_uuid,
                        email=user_in.email,
                        full_name=user_in.full_name
                    )
                    db.add(db_user)
                    db.commit()
                    db.refresh(db_user)
                
                return TokenResponse(access_token=access_token, user_id=user_id)
            else:
                err_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=err_data.get("msg") or err_data.get("error_description") or "Registration failed via Supabase."
                )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Auth gateway communication error: {str(exc)}"
        )

@router.post("/login", response_model=TokenResponse, tags=["Authentication"])
async def login_user(login_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    rate_limit_check(request, limit=15)
    
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": login_in.email,
        "password": login_in.password
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                access_token = data.get("access_token")
                user_id = data.get("user", {}).get("id")
                
                if not access_token or not user_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Login succeeded, but no session token was generated."
                    )
                
                # Check/insert user profile if missing
                user_uuid = uuid.UUID(user_id)
                db_user = db.query(User).filter(User.id == user_uuid).first()
                if not db_user:
                    db_user = User(
                        id=user_uuid,
                        email=login_in.email,
                        full_name=data.get("user", {}).get("user_metadata", {}).get("full_name", "Engineering Member")
                    )
                    db.add(db_user)
                    db.commit()
                    db.refresh(db_user)
                    
                return TokenResponse(access_token=access_token, user_id=user_id)
            else:
                err_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=err_data.get("error_description") or err_data.get("msg") or "Invalid email or password."
                )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Auth gateway communication error: {str(exc)}"
        )

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

