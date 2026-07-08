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

    # Auth. Accounts live in the database (see /auth/signup); only the JWT signing
    # config is here. Production MUST override JWT_SECRET via an environment variable.
    JWT_SECRET: str = "dev-secret-change-me-in-production-please-32+chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # one week


settings = Settings()

_DEFAULT_JWT_SECRET = Settings.model_fields["JWT_SECRET"].default


def assert_jwt_secret_is_safe(current: Settings = settings) -> None:
    """Refuse to start production-shaped deployments on the public dev JWT secret.

    A Postgres DATABASE_URL is our proxy for "production": there, a missing
    JWT_SECRET env var must be a hard error, not a silent fallback to the default
    (which would make every token forgeable). SQLite/dev stays friction-free.
    """
    if current.JWT_SECRET == _DEFAULT_JWT_SECRET and current.DATABASE_URL.startswith("postgresql"):
        raise RuntimeError(
            "JWT_SECRET is still the built-in dev default while running against "
            "Postgres. Set a long random JWT_SECRET environment variable."
        )
