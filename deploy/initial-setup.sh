#!/usr/bin/env bash
# =============================================================================
# initial-setup.sh — First-time VPS setup (run ONCE on a fresh VPS)
# =============================================================================
# Tested on: Ubuntu 22.04 / 24.04
# Usage:     sudo bash initial-setup.sh
# =============================================================================
set -euo pipefail

DOMAIN="${1:-your-domain.com}"         # Pass domain as first arg, or edit here
APP_DIR="/opt/finance"
DB_NAME="finance_db"
DB_USER="finance_user"
DB_PASS="${2:-$(openssl rand -hex 16)}"  # Auto-generate if not provided

echo "========================================"
echo " Finance App — Initial VPS Setup"
echo " Domain: $DOMAIN"
echo "========================================"

# ──────────────────────────────────────────────
# 1. System packages
# ──────────────────────────────────────────────
echo "[1/8] Installing system packages..."
apt update && apt upgrade -y
apt install -y \
    python3 python3-venv python3-pip \
    postgresql postgresql-contrib \
    nginx certbot python3-certbot-nginx \
    git curl gzip

# Install Node.js 20 LTS
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# ──────────────────────────────────────────────
# 2. Create system user
# ──────────────────────────────────────────────
echo "[2/8] Creating 'finance' system user..."
id -u finance &>/dev/null || useradd -r -m -s /bin/bash finance

# ──────────────────────────────────────────────
# 3. Create PostgreSQL database
# ──────────────────────────────────────────────
echo "[3/8] Setting up PostgreSQL..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# ──────────────────────────────────────────────
# 4. Clone repo & set up directories
# ──────────────────────────────────────────────
echo "[4/8] Setting up application directory..."
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
    echo "  → Clone your repo into $APP_DIR:"
    echo "    git clone <your-repo-url> $APP_DIR"
    echo "  → Then re-run this script."
    echo ""
    echo "  For now, creating directory structure..."
    mkdir -p "$APP_DIR/backend" "$APP_DIR/frontend" "$APP_DIR/deploy"
fi
chown -R finance:finance "$APP_DIR"

# ──────────────────────────────────────────────
# 5. Backend setup
# ──────────────────────────────────────────────
echo "[5/8] Setting up backend..."
cd "$APP_DIR/backend"

# Create virtualenv
python3 -m venv venv
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Create .env from template
if [ ! -f "finance_app/.env" ]; then
    SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
    cat > finance_app/.env <<EOF
DEBUG=False
SECRET_KEY=$SECRET_KEY
ALLOWED_HOSTS=$DOMAIN,$(hostname -I | awk '{print $1}')
CSRF_TRUSTED_ORIGINS=https://$DOMAIN
CORS_ALLOWED_ORIGINS=https://$DOMAIN
DATABASE_URL=postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -hex 8)
ADMIN_EMAIL=admin@$DOMAIN
BACKUP_DIR=/var/backups/finance_app
MAX_BACKUPS=30
EOF
    echo "  → Backend .env created. REVIEW IT: $APP_DIR/backend/finance_app/.env"
fi

# Run initial setup
cd finance_app
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py create_admin
deactivate

# ──────────────────────────────────────────────
# 6. Frontend setup
# ──────────────────────────────────────────────
echo "[6/8] Setting up frontend..."
cd "$APP_DIR/frontend"
if [ ! -f ".env.production.local" ]; then
    echo "NEXT_PUBLIC_API_URL=https://$DOMAIN/api" > .env.production.local
fi
npm install
npm run build
# Copy static assets for standalone mode
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true

# ──────────────────────────────────────────────
# 7. Install services
# ──────────────────────────────────────────────
echo "[7/8] Installing systemd services & Nginx..."

# Systemd services
cp "$APP_DIR/deploy/finance-backend.service" /etc/systemd/system/
cp "$APP_DIR/deploy/finance-frontend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable finance-backend finance-frontend
systemctl start finance-backend finance-frontend

# Nginx
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/finance
# Replace domain placeholder
sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/finance
ln -sf /etc/nginx/sites-available/finance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ──────────────────────────────────────────────
# 8. Backup cron
# ──────────────────────────────────────────────
echo "[8/8] Setting up daily backups..."
mkdir -p /var/backups/finance_app
chown finance:finance /var/backups/finance_app

# Add daily backup cron job
CRON_LINE="0 2 * * * cd $APP_DIR/backend/finance_app && $APP_DIR/backend/venv/bin/python manage.py backup_data >> /var/log/finance_backup.log 2>&1"
(sudo -u finance crontab -l 2>/dev/null | grep -v backup_data; echo "$CRON_LINE") | sudo -u finance crontab -

echo ""
echo "========================================"
echo " Setup Complete! ✓"
echo "========================================"
echo ""
echo " Database: $DB_NAME"
echo " DB User:  $DB_USER"
echo " DB Pass:  $DB_PASS"
echo ""
echo " ⚠ SAVE THESE CREDENTIALS SECURELY!"
echo ""
echo " Next steps:"
echo "   1. Review .env: nano $APP_DIR/backend/finance_app/.env"
echo "   2. (Optional) Set up SSL: sudo certbot --nginx -d $DOMAIN"
echo "   3. Open in browser: http://$DOMAIN"
echo ""
