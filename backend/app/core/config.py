import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "CogniQA API"
    API_V1_STR: str = "/api/v1"
    
    # Supabase Settings
    SUPABASE_URL: str = Field(default="https://your-supabase-project.supabase.co", env="NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_ANON_KEY: str = Field(default="dummy-key", env="NEXT_PUBLIC_SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="dummy-key", env="SUPABASE_SERVICE_ROLE_KEY")
    
    # DB URL Fallback
    DATABASE_URL: str = Field(default="postgresql://postgres:postgres@localhost:5432/cogniqa", env="DATABASE_URL")
    
    # OpenAI Settings
    OPENAI_API_KEY: str = Field(default="dummy-key", env="OPENAI_API_KEY")
    
    # JWT security settings
    SECRET_KEY: str = "supersecret-developer-platforms-key-10293847"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    class Config:
        case_sensitive = True
        env_file = ".env.local"

settings = Settings()
