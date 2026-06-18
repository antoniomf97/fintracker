from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


def _engine_options(url: str) -> dict[str, object]:
    """Engine kwargs that differ by database dialect.

    SQLite needs ``check_same_thread=False`` to be usable across FastAPI's threads;
    that argument is invalid elsewhere. For server databases (Postgres) we instead
    enable ``pool_pre_ping`` so a connection dropped while idle (timeout, restart)
    is re-checked and replaced rather than surfacing as an error.
    """
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {"pool_pre_ping": True}


engine = create_engine(settings.DATABASE_URL, **_engine_options(settings.DATABASE_URL))

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Import models first so they register on Base.metadata."""
    from app.models import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
