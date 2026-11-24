#!/usr/bin/env bash
# =============================================================================
# FlowTrack — Production Deployment Script (AWS EC2 / Linux)
# =============================================================================
set -euo pipefail

echo "=========================================="
echo " Starting FlowTrack Deployment"
echo "=========================================="

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production file not found!"
    echo "Please copy .env.production.example to .env.production and configure your environment variables."
    exit 1
fi

# Ensure Docker and Docker Compose are installed
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose plugin is required. Aborting." >&2; exit 1; }

echo "--> Pulling base images & building containers..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "--> Starting production containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d

echo "--> Waiting for backend service to become healthy..."
TIMEOUT=60
COUNTER=0
until docker compose -f docker-compose.prod.yml ps backend | grep -q "healthy"; do
    sleep 2
    COUNTER=$((COUNTER + 2))
    if [ $COUNTER -ge $TIMEOUT ]; then
        echo "WARNING: Backend healthcheck timed out. Checking logs..."
        docker compose -f docker-compose.prod.yml logs backend
        break
    fi
done

echo "--> Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput

echo "=========================================="
echo " FlowTrack deployed successfully!"
echo " Check status with: docker compose -f docker-compose.prod.yml ps"
echo " View logs with:   docker compose -f docker-compose.prod.yml logs -f"
echo "=========================================="
