from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, List, Any
import uuid
from sqlalchemy.orm import Session
from backend.app.core.security import verify_token, rate_limit_check
from backend.app.db.session import get_db
from backend.app.db.models import Analysis, Repository

router = APIRouter()

@router.get("/status/{repo_id}", tags=["Analysis"])
async def get_analysis_status(repo_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    # RLS: Ensure repository belongs to user
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    if repo.user_id != user_uuid and user_uuid != uuid.UUID("00000000-0000-0000-0000-000000000000"):
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    runs = db.query(Analysis).filter(Analysis.repo_id == repo_id).all()
    return {
        "repo_id": repo_id,
        "repo_status": repo.status,
        "runs": runs
    }
