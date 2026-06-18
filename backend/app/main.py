from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import require_auth
from app.database import SessionLocal, init_db
from app.routers import auth, categories, health, recurring, transactions
from app.services.categories import backfill_categories


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        backfill_categories(db)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public routes: health check and login.
app.include_router(health.router)
app.include_router(auth.router, prefix=settings.API_PREFIX)

# Data routes require a valid bearer token.
protected = [Depends(require_auth)]
app.include_router(categories.router, prefix=settings.API_PREFIX, dependencies=protected)
app.include_router(transactions.router, prefix=settings.API_PREFIX, dependencies=protected)
app.include_router(recurring.router, prefix=settings.API_PREFIX, dependencies=protected)
