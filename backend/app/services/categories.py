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


def rename_category(db: Session, category: Category, new_name: str) -> Category:
    """Rename ``category`` and cascade the new name to rows that reference it.

    Categories are denormalized onto transactions and recurring rules (stored as a
    plain string), so a rename has to update those rows too or the data would drift
    from the category list. Raises ``ValueError`` if another category already uses the
    target name for this type (which would break the name+type uniqueness).
    """
    new_name = new_name.strip()
    if not new_name or new_name == category.name:
        return category

    clash = (
        db.query(Category)
        .filter(
            Category.type == category.type,
            Category.name == new_name,
            Category.id != category.id,
        )
        .first()
    )
    if clash is not None:
        raise ValueError(f'A "{new_name}" {category.type} category already exists.')

    old_name = category.name
    db.query(Transaction).filter_by(category=old_name, type=category.type).update(
        {Transaction.category: new_name}, synchronize_session=False
    )
    db.query(RecurringTransaction).filter_by(category=old_name, type=category.type).update(
        {RecurringTransaction.category: new_name}, synchronize_session=False
    )
    category.name = new_name
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category: Category) -> None:
    """Delete ``category`` and un-categorize the rows that referenced it.

    Because the category name is denormalized onto transactions and recurring rules,
    those rows are reset to an empty category (the "needs categorizing" state) rather
    than left pointing at a name that no longer exists. Blanking them also keeps the
    delete durable: ``backfill_categories`` skips empty names, so the category isn't
    resurrected from old rows on the next startup.
    """
    db.query(Transaction).filter_by(category=category.name, type=category.type).update(
        {Transaction.category: ""}, synchronize_session=False
    )
    db.query(RecurringTransaction).filter_by(category=category.name, type=category.type).update(
        {RecurringTransaction.category: ""}, synchronize_session=False
    )
    db.delete(category)
    db.commit()


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
