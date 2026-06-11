import datetime

from sqlalchemy.orm import Session

from app.models.models import RecurringTransaction, Transaction


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        first_of_next = datetime.date(year + 1, 1, 1)
    else:
        first_of_next = datetime.date(year, month + 1, 1)
    return (first_of_next - datetime.timedelta(days=1)).day


def add_months(d: datetime.date, months: int) -> datetime.date:
    """Add (or subtract) months, clamping the day to the target month's last day."""
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, _days_in_month(year, month))
    return datetime.date(year, month, day)


def occurrence(start: datetime.date, frequency: str, k: int) -> datetime.date:
    """The k-th occurrence (k starting at 0) of a rule, computed from its start date."""
    if frequency == "daily":
        return start + datetime.timedelta(days=k)
    if frequency == "weekly":
        return start + datetime.timedelta(weeks=k)
    if frequency == "biweekly":
        return start + datetime.timedelta(weeks=2 * k)
    if frequency == "monthly":
        return add_months(start, k)
    if frequency == "quarterly":
        return add_months(start, 3 * k)
    if frequency == "yearly":
        return add_months(start, 12 * k)
    raise ValueError(f"Unknown frequency: {frequency}")


def generate_for_rule(rule: RecurringTransaction, today: datetime.date) -> list[Transaction]:
    """Build (but do not persist) the transactions a rule is due to produce up to today.

    Occurrences are always recomputed from the rule's start_date so month-end dates
    don't drift, and only those after last_generated_date are returned.
    """
    if not rule.is_active:
        return []

    cap = today if rule.end_date is None else min(today, rule.end_date)
    created: list[Transaction] = []
    k = 0
    while True:
        occ = occurrence(rule.start_date, rule.frequency, k)
        if occ > cap:
            break
        if rule.last_generated_date is None or occ > rule.last_generated_date:
            created.append(
                Transaction(
                    date=occ,
                    type=rule.type,
                    category=rule.category,
                    amount=rule.amount,
                    description=rule.description,
                    recurring_id=rule.id,
                )
            )
        k += 1

    if created:
        rule.last_generated_date = created[-1].date
    return created


def generate_due_transactions(db: Session, today: datetime.date | None = None) -> int:
    """Materialize all due transactions for active rules. Returns the number created."""
    if today is None:
        today = datetime.date.today()

    rules = db.query(RecurringTransaction).filter_by(is_active=True).all()
    total = 0
    for rule in rules:
        new_transactions = generate_for_rule(rule, today)
        db.add_all(new_transactions)
        total += len(new_transactions)
    db.commit()
    return total
