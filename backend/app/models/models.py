import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[datetime.date] = mapped_column(index=True)
    type: Mapped[str]
    category: Mapped[str] = mapped_column(index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    description: Mapped[str | None]
    # Set when this row was generated from a recurring rule; null for manual entries.
    recurring_id: Mapped[int | None] = mapped_column(
        ForeignKey("recurring_transactions.id"), index=True
    )


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str]
    category: Mapped[str] = mapped_column(index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    description: Mapped[str | None]
    frequency: Mapped[str]  # daily/weekly/biweekly/monthly/quarterly/yearly
    start_date: Mapped[datetime.date]
    end_date: Mapped[datetime.date | None]
    is_active: Mapped[bool] = mapped_column(default=True)
    last_generated_date: Mapped[datetime.date | None]
