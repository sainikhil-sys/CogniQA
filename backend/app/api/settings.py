from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
import uuid
import secrets
from sqlalchemy.orm import Session
from backend.app.core.security import verify_token, rate_limit_check
from backend.app.db.session import get_db
from backend.app.db.models import User, Integration, ActivityLog

router = APIRouter()

class ProfileUpdate(BaseModel):
    full_name: str

class IntegrationConnect(BaseModel):
    provider: str # 'github', 'vercel', 'netlify', etc.
    token: str

class APIKeyGenerate(BaseModel):
    name: str

@router.get("", tags=["Settings"])
async def get_settings(db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    integrations = db.query(Integration).filter(Integration.user_id == user_uuid).all()
    
    # Retrieve API Key generation events from activity logs
    api_key_logs = db.query(ActivityLog).filter(
        ActivityLog.user_id == user_uuid,
        ActivityLog.action == "generate_api_key"
    ).all()
    
    keys = []
    for log in api_key_logs:
        keys.append({
            "id": str(log.id),
            "name": log.details.split(":")[0] if ":" in log.details else "Developer Key",
            "prefix": "cq_" + log.details.split(":")[1][:6] + "..." if ":" in log.details else "cq_xxxxxx...",
            "created_at": log.created_at.isoformat()
        })
        
    return {
        "profile": {
            "email": user.email,
            "full_name": user.full_name or "Engineering Member"
        },
        "integrations": [
            {
                "id": str(integ.id),
                "provider": integ.provider,
                "status": integ.status,
                "created_at": integ.created_at.isoformat()
            }
            for integ in integrations
        ],
        "api_keys": keys
    }

@router.put("/profile", tags=["Settings"])
async def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    user.full_name = payload.full_name
    
    log = ActivityLog(
        user_id=user_uuid,
        action="update_profile",
        details="Updated profile display name"
    )
    db.add(log)
    db.commit()
    
    return {"message": "Profile updated successfully", "full_name": user.full_name}

@router.post("/integrations", tags=["Settings"])
async def connect_integration(payload: IntegrationConnect, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    existing = db.query(Integration).filter(
        Integration.user_id == user_uuid,
        Integration.provider == payload.provider
    ).first()
    
    if existing:
        existing.token = payload.token
        existing.status = "active"
    else:
        new_integ = Integration(
            user_id=user_uuid,
            provider=payload.provider,
            token=payload.token,
            status="active"
        )
        db.add(new_integ)
        
    log = ActivityLog(
        user_id=user_uuid,
        action="connect_integration",
        details=f"Connected {payload.provider} integration integration"
    )
    db.add(log)
    db.commit()
    
    return {"message": f"Successfully connected to {payload.provider} gateway"}

@router.delete("/integrations/{integ_id}", tags=["Settings"])
async def disconnect_integration(integ_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    integ = db.query(Integration).filter(
        Integration.id == integ_id,
        Integration.user_id == user_uuid
    ).first()
    
    if not integ:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    db.delete(integ)
    
    log = ActivityLog(
        user_id=user_uuid,
        action="disconnect_integration",
        details=f"Disconnected {integ.provider} integration"
    )
    db.add(log)
    db.commit()
    
    return {"message": "Integration disconnected successfully"}

@router.post("/keys", tags=["Settings"])
async def generate_api_key(payload: APIKeyGenerate, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    raw_key = secrets.token_hex(24)
    hashed_key_val = secrets.token_hex(16)
    
    log = ActivityLog(
        user_id=user_uuid,
        action="generate_api_key",
        details=f"{payload.name}:{hashed_key_val}"
    )
    db.add(log)
    db.commit()
    
    return {
        "name": payload.name,
        "api_key": f"cq_{raw_key}",
        "message": "Copy this API key. It will not be shown again."
    }
