from fastapi import APIRouter, Depends, status, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from sqlalchemy.orm import Session
from backend.app.core.security import verify_token, rate_limit_check
from backend.app.db.session import get_db
from backend.app.db.models import ChatHistory, Repository
from backend.app.services.ai_engine import AIEngine

router = APIRouter()

class ChatRequest(BaseModel):
    repo_id: uuid.UUID
    question: str
    file_context: Optional[str] = ""

@router.post("", tags=["AI Assistant"])
async def ask_question(payload: ChatRequest, request: Request, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    rate_limit_check(request, limit=20)
    
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")

    # RLS: Ensure user owns repository
    repo = db.query(Repository).filter(Repository.id == payload.repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    if repo.user_id != user_uuid and user_uuid != uuid.UUID("00000000-0000-0000-0000-000000000000"):
        raise HTTPException(status_code=403, detail="Unauthorized access to codebase context")
        
    # Execute RAG query against pgvector chunks
    ai_response = AIEngine.query_repository(
        db=db,
        repo_id=payload.repo_id,
        question=payload.question
    )
    
    # Save log to database
    chat_log = ChatHistory(
        repo_id=payload.repo_id,
        user_id=user_uuid,
        question=payload.question,
        response=ai_response
    )
    db.add(chat_log)
    db.commit()
    db.refresh(chat_log)
    
    return chat_log

@router.get("/history/{repo_id}", tags=["AI Assistant"])
async def get_chat_history(repo_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    # RLS check: User only accesses their own history
    history = db.query(ChatHistory).filter(
        ChatHistory.repo_id == repo_id,
        ChatHistory.user_id == user_uuid
    ).order_by(ChatHistory.created_at.asc()).all()
    
    return history
