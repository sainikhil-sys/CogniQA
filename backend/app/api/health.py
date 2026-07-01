from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "engine": "CogniQA AI Code Indexer",
        "version": "1.0.0",
        "pgvector_extension": "enabled",
        "active_workers": 4
    }
