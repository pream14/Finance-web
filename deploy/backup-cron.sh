#!/usr/bin/env bash
# =============================================================================
# backup-cron.sh — Manual database backup (also used by cron)
# =============================================================================
# Usage: bash /opt/finance/deploy/backup-cron.sh
# Cron:  0 2 * * * bash /opt/finance/deploy/backup-cron.sh >> /var/log/finance_backup.log 2>&1
# =============================================================================
set -euo pipefail

APP_DIR="/opt/finance"
cd "$APP_DIR/backend/finance_app"
source "$APP_DIR/backend/venv/bin/activate"
python manage.py backup_data
