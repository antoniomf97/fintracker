from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Transaction


def available_balance(db: Session, user_id: int) -> Decimal:
    """Money a user has available to set aside: income minus expenses minus savings.

    Savings draws down this pool, so a new savings transaction is only allowed when
    its amount does not exceed the returned value.
    """
    rows = (
        db.query(Transaction.type, func.sum(Transaction.amount))
        .filter_by(user_id=user_id)
        .group_by(Transaction.type)
        .all()
    )
    totals = {type_: amount for type_, amount in rows}
    income = totals.get("income") or Decimal(0)
    expense = totals.get("expense") or Decimal(0)
    savings = totals.get("savings") or Decimal(0)
    return income - expense - savings
