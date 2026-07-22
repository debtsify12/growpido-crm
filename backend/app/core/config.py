from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./growpido.db"
    SECRET_KEY: str = "growpido-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    APP_NAME: str = "Growpido CRM"
    DEBUG: bool = True

    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Super Admin credentials (set in .env for production)
    SUPER_ADMIN_EMAIL: str = "superadmin@growpido.com"
    SUPER_ADMIN_PASSWORD: str = "SuperAdmin@2024"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # Automation defaults
    STUCK_LEAD_DAYS: int = 7
    MAX_FOLLOWUP_ATTEMPTS: int = 5
    PROPOSAL_FOLLOWUP_DAYS: int = 3
    NEGOTIATION_FOLLOWUP_DAYS: int = 2

    # SMTP / Email Config
    SMTP_SERVER: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@growpido.com"
    FRONTEND_URL: str = "http://localhost:3000"

    # OpenRouter / LLM Settings
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    CONTENT_STRATEGIST_MODEL: str = "openai/gpt-3.5-turbo"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
