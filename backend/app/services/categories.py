from sqlalchemy.orm import Session

from app.models.models import Category, RecurringTransaction, Transaction


def ensure_category(db: Session, name: str, type_: str, user_id: int) -> None:
    """Persist ``name`` as a category for ``user_id`` + ``type_`` if not stored yet.

    Called whenever a transaction or recurring rule is saved so the set of categories
    grows, scoped per user and transaction type, as it's used. Does not commit — the
    caller's commit covers it.
    """
    name = name.strip()
    if not name:
        return
    if db.query(Category).filter_by(name=name, type=type_, user_id=user_id).first() is None:
        db.add(Category(name=name, type=type_, user_id=user_id))


def rename_category(db: Session, category: Category, new_name: str) -> Category:
    """Rename ``category`` and cascade the new name to the owner's rows that use it.

    Categories are denormalized onto transactions and recurring rules (stored as a
    plain string), so a rename has to update those rows too or the data would drift
    from the category list. Raises ``ValueError`` if the owner already has another
    category with the target name for this type (which would break uniqueness).
    """
    new_name = new_name.strip()
    if not new_name or new_name == category.name:
        return category

    clash = (
        db.query(Category)
        .filter(
            Category.user_id == category.user_id,
            Category.type == category.type,
            Category.name == new_name,
            Category.id != category.id,
        )
        .first()
    )
    if clash is not None:
        raise ValueError(f'A "{new_name}" {category.type} category already exists.')

    old_name = category.name
    db.query(Transaction).filter_by(
        category=old_name, type=category.type, user_id=category.user_id
    ).update({Transaction.category: new_name}, synchronize_session=False)
    db.query(RecurringTransaction).filter_by(
        category=old_name, type=category.type, user_id=category.user_id
    ).update({RecurringTransaction.category: new_name}, synchronize_session=False)
    category.name = new_name
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category: Category) -> None:
    """Delete ``category`` and un-categorize the owner's rows that referenced it.

    Because the category name is denormalized onto transactions and recurring rules,
    those rows are reset to an empty category (the "needs categorizing" state) rather
    than left pointing at a name that no longer exists. Blanking them also keeps the
    delete durable: ``backfill_categories`` skips empty names, so the category isn't
    resurrected from old rows on the next startup.
    """
    db.query(Transaction).filter_by(
        category=category.name, type=category.type, user_id=category.user_id
    ).update({Transaction.category: ""}, synchronize_session=False)
    db.query(RecurringTransaction).filter_by(
        category=category.name, type=category.type, user_id=category.user_id
    ).update({RecurringTransaction.category: ""}, synchronize_session=False)
    db.delete(category)
    db.commit()


def backfill_categories(db: Session) -> None:
    """Seed the categories table from (user, category, type) tuples already used by rows.

    Idempotent. Lets the dropdowns show categories from data that predates the
    categories table (e.g. transactions created before this feature existed).
    """
    tuples = set(db.query(Transaction.user_id, Transaction.category, Transaction.type).distinct())
    tuples |= set(
        db.query(
            RecurringTransaction.user_id,
            RecurringTransaction.category,
            RecurringTransaction.type,
        ).distinct()
    )
    for user_id, name, type_ in tuples:
        ensure_category(db, name, type_, user_id)
    db.commit()
