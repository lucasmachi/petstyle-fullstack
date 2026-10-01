from functools import lru_cache
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: str = "development"
    database_url: str = "sqlite:///./petstyle.db"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000"
    cookie_secure: bool = False
    session_hours: int = 12
    demo_mode: bool = False
    redis_enabled: bool = False
    redis_url: str = "redis://localhost:6379/0"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_starttls: bool = False
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "Pet Style <agenda@petstyle.example>"
    timezone: str = "America/Sao_Paulo"
    cancellation_hours: int = 2

    @property
    def origins(self) -> list[str]:
        return [s.strip().rstrip("/") for s in self.allowed_origins.split(",") if s.strip()]

    @model_validator(mode="after")
    def production_settings(self):
        if self.app_env == "production":
            if self.demo_mode or not self.cookie_secure:
                raise ValueError("Produção exige DEMO_MODE=false e COOKIE_SECURE=true.")
            if not self.origins or any(not s.startswith("https://") for s in self.origins):
                raise ValueError("Produção exige ALLOWED_ORIGINS com HTTPS.")
        return self


@lru_cache
def get_settings():
    return Settings()
