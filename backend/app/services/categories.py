from sqlalchemy.orm import Session

from app.models.models import Category, RecurringTransaction, Transaction


def ensure_category(db: Session, name: str) -> None:
    """Persist ``name`` as a category if it isn't stored yet.

    Called whenever a transaction or recurring rule is saved so the set of
    categories grows as the user uses them. Does not commit — the caller's
    commit covers it.
    """
    name = name.strip()
    if not name:
        return
    if db.query(Category).filter_by(name=name).first() is None:
        db.add(Category(name=name))


def backfill_categories(db: Session) -> None:
    """Seed the categories table from categories already used by existing rows.

    Idempotent. Lets the dropdown show categories from data that predates the
    categories table (e.g. transactions created before this feature existed).
    """
    names = {n for (n,) in db.query(Transaction.category).distinct()}
    names |= {n for (n,) in db.query(RecurringTransaction.category).distinct()}
    for name in names:
        ensure_category(db, name)
    db.commit()
