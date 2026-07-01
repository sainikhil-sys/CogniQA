import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api import auth, repositories, analyze, chat, reports, health

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI Backend Microservice for CogniQA Code Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set strict CORS parameters to allow communication with the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://cogniqa.codes"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware to enforce Enterprise Security Headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    start_time = time.time()
    response: Response = await call_next(request)
    
    # Secure Cookie options & headers
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Process time logging
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    
    return response

# Register API Route modules
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth")
app.include_router(repositories.router, prefix=f"{settings.API_V1_STR}/repositories")
app.include_router(analyze.router, prefix=f"{settings.API_V1_STR}/analyze")
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat")
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports")
app.include_router(health.router, prefix=f"{settings.API_V1_STR}") # exposing /health directly

@app.get("/")
async def root():
    return {
        "message": "Welcome to CogniQA Core API Engine",
        "documentation": "/docs",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
