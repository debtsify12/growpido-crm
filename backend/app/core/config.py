from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/growpido_crm"
    SECRET_KEY: str = "growpido-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    APP_NAME: str = "Growpido CRM"
    DEBUG: bool = True

    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # Automation defaults
    STUCK_LEAD_DAYS: int = 7
    MAX_FOLLOWUP_ATTEMPTS: int = 5
    PROPOSAL_FOLLOWUP_DAYS: int = 3
    NEGOTIATION_FOLLOWUP_DAYS: int = 2

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
