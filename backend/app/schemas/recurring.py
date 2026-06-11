import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.transaction import TransactionType

Frequency = Literal["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]


class RecurringBase(BaseModel):
    type: TransactionType
    category: str = Field(min_length=1)
    amount: Decimal = Field(gt=0, decimal_places=2)
    description: str | None = None
    frequency: Frequency
    start_date: datetime.date
    end_date: datetime.date | None = None
    is_active: bool = True


class RecurringCreate(RecurringBase):
    pass


class RecurringUpdate(BaseModel):
    type: TransactionType | None = None
    category: str | None = Field(default=None, min_length=1)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    description: str | None = None
    frequency: Frequency | None = None
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None
    is_active: bool | None = None


class RecurringRead(RecurringBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_generated_date: datetime.date | None = None
