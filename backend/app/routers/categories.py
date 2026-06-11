from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Category
from app.schemas.category import CategoryCreate, CategoryRead

router = APIRouter(prefix="/categories", tags=["categories"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[CategoryRead])
def list_categories(db: DbSession) -> list[Category]:
    return db.query(Category).order_by(Category.name).all()


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: DbSession) -> Category:
    name = payload.name.strip()
    # Idempotent: reusing an existing name just returns the stored category.
    existing = db.query(Category).filter_by(name=name).first()
    if existing is not None:
        return existing
    category = Category(name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
