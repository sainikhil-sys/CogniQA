from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from backend.app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_bearer = HTTPBearer()

# Simulated Memory Rate Limiter
RATE_LIMIT_STRIKES = {}

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> str:
    token = credentials.credentials
    
    # Raise HTTP 401 if missing, invalid, or dummy bypass is passed
    if not token or token == "true" or token.startswith("demo-"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication credentials"
        )
        
    try:
        # Query Supabase user API with bearer token
        url = f"{settings.SUPABASE_URL}/auth/v1/user"
        headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {token}"
        }
        with httpx.Client(timeout=5.0) as client:
            response = client.get(url, headers=headers)
            if response.status_code == 200:
                user_data = response.json()
                return user_data["id"]
            else:
                # Handle error
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication token rejected by Supabase"
                )
    except HTTPException as he:
        raise he
    except Exception as e:
        # Fallback bypass to ensure local workspace developers do not block if keys are not set yet
        if settings.SUPABASE_URL == "https://your-supabase-project.supabase.co":
            return "00000000-0000-0000-0000-000000000000"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
        )

# Enterprise Rate Limiter Guard
def rate_limit_check(request: Request, limit: int = 60):
    client_ip = request.client.host if request.client else "unknown-node"
    now = datetime.now()
    
    if client_ip not in RATE_LIMIT_STRIKES:
        RATE_LIMIT_STRIKES[client_ip] = []
        
    # Prune historical calls beyond 1 minute window
    RATE_LIMIT_STRIKES[client_ip] = [
        t for t in RATE_LIMIT_STRIKES[client_ip] 
        if now - t < timedelta(minutes=1)
    ]
    
    if len(RATE_LIMIT_STRIKES[client_ip]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many concurrent operations. Rate limit exceeded."
        )
        
    RATE_LIMIT_STRIKES[client_ip].append(now)
