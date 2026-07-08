import pytest

from app.core.config import Settings, assert_jwt_secret_is_safe

_DEFAULT_SECRET = Settings.model_fields["JWT_SECRET"].default


def _settings(**overrides) -> Settings:
    return Settings(_env_file=None, **overrides)


def test_default_secret_with_postgres_refuses_to_start():
    current = _settings(
        DATABASE_URL="postgresql+psycopg://u:p@host:5432/db",
        JWT_SECRET=_DEFAULT_SECRET,
    )
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        assert_jwt_secret_is_safe(current)


def test_default_secret_with_sqlite_starts():
    current = _settings(
        DATABASE_URL="sqlite:///./data/fintracker.db",
        JWT_SECRET=_DEFAULT_SECRET,
    )
    assert_jwt_secret_is_safe(current)


def test_custom_secret_with_postgres_starts():
    current = _settings(
        DATABASE_URL="postgresql+psycopg://u:p@host:5432/db",
        JWT_SECRET="a-real-production-secret-with-plenty-of-entropy",
    )
    assert_jwt_secret_is_safe(current)
