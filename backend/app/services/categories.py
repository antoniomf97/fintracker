from sqlalchemy.orm import Session

from app.models.models import Category, RecurringTransaction, Transaction


def ensure_category(db: Session, name: str, type_: str) -> None:
    """Persist ``name`` as a category for ``type_`` if that pair isn't stored yet.

    Called whenever a transaction or recurring rule is saved so the set of
    categories grows, scoped per transaction type, as the user uses them. Does not
    commit — the caller's commit covers it.
    """
    name = name.strip()
    if not name:
        return
    if db.query(Category).filter_by(name=name, type=type_).first() is None:
        db.add(Category(name=name, type=type_))


def backfill_categories(db: Session) -> None:
    """Seed the categories table from (category, type) pairs already used by rows.

    Idempotent. Lets the dropdowns show categories from data that predates the
    categories table (e.g. transactions created before this feature existed).
    """
    pairs = set(db.query(Transaction.category, Transaction.type).distinct())
    pairs |= set(db.query(RecurringTransaction.category, RecurringTransaction.type).distinct())
    for name, type_ in pairs:
        ensure_category(db, name, type_)
    db.commit()
