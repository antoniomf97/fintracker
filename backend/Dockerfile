# Backend API — FastAPI, dependencies managed with uv.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Reproducible, faster installs: compile bytecode and copy packages into the venv
# (symlinks don't survive the later COPY layers / bind mounts).
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install dependencies first so this layer is cached until the lockfile changes.
# This is a non-package ("virtual") project, so only the deps are installed.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Then the application code.
COPY app ./app

# The SQLite database lives here (DATABASE_URL=sqlite:///./data/fintracker.db).
# Mount a volume at /app/data to persist it across container restarts.
RUN mkdir -p data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# `fastapi run` serves with uvicorn (no reload) bound to all interfaces.
CMD ["uv", "run", "--frozen", "--no-dev", "fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
