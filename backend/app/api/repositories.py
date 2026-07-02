from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import uuid
import os
import re
from sqlalchemy.orm import Session
from backend.app.core.security import verify_token, rate_limit_check
from backend.app.db.session import get_db
from backend.app.db.models import Repository, RepoEmbedding
from backend.app.services.parser import RepositoryParser

router = APIRouter()

class RepoConnect(BaseModel):
    name: str
    url: str
    language: str
    branch: Optional[str] = "main"

class RepoResponse(BaseModel):
    id: uuid.UUID
    repo_name: str
    repo_url: str
    language: str
    status: str
    created_at: str

    class Config:
        orm_mode = True

@router.get("", tags=["Repositories"])
async def list_repositories(db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    repos = db.query(Repository).filter(Repository.user_id == user_uuid).all()
    return repos

@router.post("", tags=["Repositories"], status_code=status.HTTP_201_CREATED)
async def connect_repository(
    repo_in: RepoConnect, 
    background_tasks: BackgroundTasks,
    request: Request, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(verify_token)
):
    rate_limit_check(request, limit=15)
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")

    existing = db.query(Repository).filter(
        Repository.repo_url == repo_in.url,
        Repository.user_id == user_uuid
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository URL has already been connected by your profile"
        )
        
    new_repo = Repository(
        user_id=user_uuid,
        repo_name=repo_in.name,
        repo_url=repo_in.url,
        language=repo_in.language,
        status="Indexing"
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)
    
    # Run cloning & AST parser pipeline in background worker thread
    background_tasks.add_task(
        RepositoryParser.process_and_index_repository,
        new_repo.id,
        new_repo.repo_url,
        db
    )
    
    return new_repo

@router.delete("/{repo_id}", tags=["Repositories"])
async def delete_repository(repo_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")

    target_repo = db.query(Repository).filter(Repository.id == repo_id).first()
            
    if not target_repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found in workspace"
        )
        
    if target_repo.user_id != user_uuid and user_uuid != uuid.UUID("00000000-0000-0000-0000-000000000000"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized. You do not own this repository."
        )
        
    db.delete(target_repo)
    db.commit()
    return {"message": "Repository index deleted successfully"}

@router.get("/{repo_id}/files", tags=["Repositories"])
async def get_repository_files(repo_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo.user_id != user_uuid and user_uuid != uuid.UUID("00000000-0000-0000-0000-000000000000"):
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    embeddings = db.query(RepoEmbedding).filter(RepoEmbedding.repo_id == repo_id).all()
    
    files_map = {}
    for emb in embeddings:
        content = emb.chunk_content
        lines = content.split("\n")
        first_line = lines[0] if lines else ""
        
        match = re.search(r"File:\s*([^\s\n\)]+)", first_line)
        if match:
            filepath = match.group(1)
            code_body = "\n".join(lines[1:])
            # Clean off markdown code triggers from body if any
            if code_body.startswith("```"):
                code_lines = code_body.split("\n")
                code_body = "\n".join(code_lines[1:-1])
            if filepath not in files_map:
                files_map[filepath] = []
            files_map[filepath].append(code_body)
            
    files = []
    for path, blocks in files_map.items():
        full_code = "\n".join(blocks)
        files.append({
            "path": path,
            "name": os.path.basename(path),
            "code": full_code,
            "language": "typescript" if path.endswith((".ts", ".tsx")) else "python" if path.endswith(".py") else "go" if path.endswith(".go") else "text"
        })
        
    return files
