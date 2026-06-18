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

    # Single-user auth. The dev defaults below let the app run out of the box
    # (admin / devpassword); production MUST override JWT_SECRET and
    # AUTH_PASSWORD_HASH via environment variables.
    AUTH_USERNAME: str = "admin"
    # bcrypt hash of "devpassword". Generate your own with:
    #   python -c "import bcrypt; print(bcrypt.hashpw(b'PASSWORD', bcrypt.gensalt()).decode())"
    AUTH_PASSWORD_HASH: str = "$2b$12$T0iFSme.Ium59C2Ivv1OP.HuUYgnij4vnFQLR.2.RkR1RllhJEULW"
    JWT_SECRET: str = "dev-secret-change-me-in-production-please-32+chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # one week


settings = Settings()
