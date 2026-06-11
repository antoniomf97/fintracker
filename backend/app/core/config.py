from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "fintracker"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "Backend API for fintracker"
    API_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "sqlite:///./data/fintracker.db"

    # Origins allowed to call the API from a browser (Vite dev server by default).
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]


settings = Settings()
