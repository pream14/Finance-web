#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Pull latest code and restart services (run on VPS)
# =============================================================================
# Usage: bash /opt/finance/deploy/deploy.sh
# This script is SAFE to run repeatedly — it will NOT drop your database.
# =============================================================================
set -euo pipefail

APP_DIR="/opt/finance"
BACKEND="$APP_DIR/backend"
FRONTEND="$APP_DIR/frontend"
VENV="$BACKEND/venv"

echo "========================================"
echo " Finance App — Deploying"
echo " $(date)"
echo "========================================"

# 1. Pull latest code
echo "[1/7] Pulling latest code..."
cd "$APP_DIR"
git pull origin main

# 2. Backend: install/update Python dependencies
echo "[2/7] Installing backend dependencies..."
source "$VENV/bin/activate"
pip install -q -r "$BACKEND/requirements.txt"

# 3. Backend: run migrations (safe — only applies NEW migrations)
echo "[3/7] Running database migrations..."
cd "$BACKEND/finance_app"
python manage.py migrate --noinput

# 4. Backend: collect static files
echo "[4/7] Collecting static files..."
python manage.py collectstatic --noinput

# 5. Backend: ensure admin user exists
echo "[5/7] Ensuring admin user..."
python manage.py create_admin

# 6. Frontend: install deps and build
echo "[6/7] Building frontend..."
cd "$FRONTEND"
npm install --production=false
npm run build

# Copy static assets to standalone (required for standalone output)
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true

# 7. Restart services
echo "[7/7] Restarting services..."
sudo systemctl restart finance-backend
sudo systemctl restart finance-frontend

echo "========================================"
echo " Deploy complete! ✓"
echo " Backend:  http://127.0.0.1:8000"
echo " Frontend: http://127.0.0.1:3000"
echo "========================================"
