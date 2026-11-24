# =============================================================================
# FlowTrack Backend — Production Dockerfile
# Multi-stage build: Python 3.11 slim, Gunicorn WSGI server
# =============================================================================

# --------------- Stage 1: Builder ---------------
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system deps needed for building Python packages (psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --------------- Stage 2: Runtime ---------------
FROM python:3.11-slim AS runtime

# Runtime system deps (libpq for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r flowtrack && useradd -r -g flowtrack -d /app -s /sbin/nologin flowtrack

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Collect static files at build time
# SECRET_KEY is needed by Django at import time; use a throwaway value.
RUN SECRET_KEY=build-placeholder \
    DEBUG=False \
    python manage.py collectstatic --noinput

# Ensure staticfiles dir is readable
RUN chown -R flowtrack:flowtrack /app

USER flowtrack

EXPOSE 8000

# Health-check: hit the admin login page (lightweight)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/admin/login/')" || exit 1

# Run Gunicorn — 4 workers, 120s timeout, binding to 0.0.0.0:8000
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
