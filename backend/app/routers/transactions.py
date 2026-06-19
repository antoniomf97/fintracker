from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.models import Transaction, User
from app.schemas.transaction import TransactionCreate, TransactionRead, TransactionUpdate
from app.services.balance import available_balance
from app.services.categories import ensure_category

router = APIRouter(prefix="/transactions", tags=["transactions"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: DbSession, user: CurrentUser) -> Transaction:
    if payload.type == "savings" and payload.amount > available_balance(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You don't have enough available money",
        )
    transaction = Transaction(**payload.model_dump(), user_id=user.id)
    db.add(transaction)
    ensure_category(db, transaction.category, transaction.type, user.id)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("", response_model=list[TransactionRead])
def list_transactions(db: DbSession, user: CurrentUser) -> list[Transaction]:
    return db.query(Transaction).filter_by(user_id=user.id).order_by(Transaction.date.desc()).all()


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(transaction_id: int, db: DbSession, user: CurrentUser) -> Transaction:
    transaction = db.query(Transaction).filter_by(id=transaction_id, user_id=user.id).first()
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


@router.patch("/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int, payload: TransactionUpdate, db: DbSession, user: CurrentUser
) -> Transaction:
    transaction = db.query(Transaction).filter_by(id=transaction_id, user_id=user.id).first()
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(transaction, key, value)
    ensure_category(db, transaction.category, transaction.type, user.id)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: DbSession, user: CurrentUser) -> None:
    transaction = db.query(Transaction).filter_by(id=transaction_id, user_id=user.id).first()
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    db.delete(transaction)
    db.commit()
