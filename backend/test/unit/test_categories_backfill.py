from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.models import Category, RecurringTransaction, Transaction, User
from app.services.categories import backfill_categories


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    try:
        yield session
    finally:
        session.close()


def _user(db) -> User:
    user = User(username="u", password_hash="x")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_backfill_collects_categories_from_existing_rows(db):
    user = _user(db)
    db.add(
        Transaction(
            user_id=user.id,
            date=date(2026, 6, 8),
            type="expense",
            category="food",
            amount=Decimal("10.00"),
        )
    )
    db.add(
        RecurringTransaction(
            user_id=user.id,
            type="income",
            category="salary",
            amount=Decimal("1000.00"),
            frequency="monthly",
            start_date=date(2026, 6, 1),
        )
    )
    db.commit()

    backfill_categories(db)

    pairs = sorted((c.name, c.type) for c in db.query(Category).all())
    assert pairs == [("food", "expense"), ("salary", "income")]


def test_backfill_is_idempotent_and_does_not_duplicate(db):
    user = _user(db)
    db.add(Category(user_id=user.id, name="food", type="expense"))
    db.add(
        Transaction(
            user_id=user.id,
            date=date(2026, 6, 8),
            type="expense",
            category="food",
            amount=Decimal("10.00"),
        )
    )
    db.commit()

    backfill_categories(db)

    assert [(c.name, c.type) for c in db.query(Category).all()] == [("food", "expense")]
