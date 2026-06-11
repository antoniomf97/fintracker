from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import RecurringTransaction, Transaction
from app.schemas.recurring import RecurringCreate, RecurringRead, RecurringUpdate
from app.services.categories import ensure_category
from app.services.recurring import generate_due_transactions

router = APIRouter(prefix="/recurring", tags=["recurring"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=RecurringRead, status_code=status.HTTP_201_CREATED)
def create_recurring(payload: RecurringCreate, db: DbSession) -> RecurringTransaction:
    rule = RecurringTransaction(**payload.model_dump())
    db.add(rule)
    ensure_category(db, rule.category)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("", response_model=list[RecurringRead])
def list_recurring(db: DbSession) -> list[RecurringTransaction]:
    return db.query(RecurringTransaction).order_by(RecurringTransaction.start_date.desc()).all()


@router.post("/generate")
def generate(db: DbSession) -> dict[str, int]:
    """Materialize all transactions due from active recurring rules up to today."""
    return {"created": generate_due_transactions(db)}


@router.get("/{recurring_id}", response_model=RecurringRead)
def get_recurring(recurring_id: int, db: DbSession) -> RecurringTransaction:
    rule = db.get(RecurringTransaction, recurring_id)
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recurring transaction not found"
        )
    return rule


@router.patch("/{recurring_id}", response_model=RecurringRead)
def update_recurring(
    recurring_id: int, payload: RecurringUpdate, db: DbSession
) -> RecurringTransaction:
    rule = db.get(RecurringTransaction, recurring_id)
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recurring transaction not found"
        )
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)
    ensure_category(db, rule.category)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring(recurring_id: int, db: DbSession) -> None:
    rule = db.get(RecurringTransaction, recurring_id)
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recurring transaction not found"
        )
    # Unlink already-generated transactions so they don't dangle, then drop the rule.
    db.query(Transaction).filter_by(recurring_id=recurring_id).update({"recurring_id": None})
    db.delete(rule)
    db.commit()
