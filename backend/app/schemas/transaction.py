import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TransactionType = Literal["income", "expense", "savings"]


class TransactionBase(BaseModel):
    date: datetime.date
    type: TransactionType
    # No min_length here: a transaction can be left with a blank category after its
    # category is deleted (the "needs categorizing" state). Creation tightens this below.
    category: str
    amount: Decimal = Field(gt=0, decimal_places=2)
    description: str | None = None


class TransactionCreate(TransactionBase):
    category: str = Field(min_length=1)
    # Request-only: a savings entry with this unchecked skips the "enough available
    # money" check at creation. Not persisted, so it stays off TransactionBase/Read.
    requires_income: bool = True


class TransactionUpdate(BaseModel):
    date: datetime.date | None = None
    type: TransactionType | None = None
    category: str | None = Field(default=None, min_length=1)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    description: str | None = None


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recurring_id: int | None = None
