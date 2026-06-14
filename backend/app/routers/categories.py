from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Category
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.schemas.transaction import TransactionType
from app.services.categories import delete_category, rename_category

router = APIRouter(prefix="/categories", tags=["categories"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[CategoryRead])
def list_categories(db: DbSession, type: TransactionType | None = None) -> list[Category]:
    query = db.query(Category)
    if type is not None:
        query = query.filter(Category.type == type)
    return query.order_by(Category.name).all()


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: DbSession) -> Category:
    name = payload.name.strip()
    # Idempotent: reusing an existing name+type just returns the stored category.
    existing = db.query(Category).filter_by(name=name, type=payload.type).first()
    if existing is not None:
        return existing
    category = Category(name=name, type=payload.type)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(category_id: int, payload: CategoryUpdate, db: DbSession) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    try:
        return rename_category(db, category, payload.name)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_category(category_id: int, db: DbSession) -> None:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    delete_category(db, category)
