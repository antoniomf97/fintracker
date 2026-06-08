from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.database import init_db
from app.routers import health, transactions


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(transactions.router, prefix=settings.API_PREFIX)
