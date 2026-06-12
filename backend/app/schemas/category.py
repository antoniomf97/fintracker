from pydantic import BaseModel, ConfigDict, Field

from app.schemas.transaction import TransactionType


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1)
    type: TransactionType


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: TransactionType
