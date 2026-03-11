# 🚀 Deploying Finance App on Hostinger VPS — Full Guide

This guide takes you from a **fresh Hostinger VPS** to a **fully running** Django + Next.js finance app with SSL.

---

## Step 0: Buy & Access Your Hostinger VPS

1. Go to [Hostinger VPS Hosting](https://www.hostinger.in/vps-hosting) and pick a plan (KVM 1 with 4GB RAM is plenty)
2. Choose **Ubuntu 22.04 or 24.04** as the OS
3. Set a **root password** during setup
4. Note your **VPS IP address** from the Hostinger dashboard (e.g. `123.45.67.89`)

### SSH into Your VPS

From your local machine (PowerShell/Terminal):

```bash
ssh root@123.45.67.89
```

Enter the root password you set during VPS creation.

> [!TIP]
> For easier access later, set up SSH keys:
> ```bash
> ssh-keygen -t ed25519        # (on your local machine, press Enter for defaults)
> ssh-copy-id root@123.45.67.89
> ```

---

## Step 1: Initial Server Setup (Run Once)

After SSH-ing in as `root`, run the automated setup script. But first, push your latest code changes to GitHub.

### 1.1 Push Code to GitHub (from local machine)

```bash
cd c:\Users\Pream\OneDrive\Desktop\projects\finance
git add -A
git commit -m "Migrate from Railway/Vercel to VPS"
git push origin main
```

### 1.2 Clone Repo on VPS

```bash
# On VPS as root
apt update && apt install -y git
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /opt/finance
```

> [!IMPORTANT]
> Replace `YOUR_USERNAME/YOUR_REPO` with your actual GitHub repo URL.

### 1.3 Run the Initial Setup Script

The repo includes an automated setup script at [deploy/initial-setup.sh](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/deploy/initial-setup.sh):

```bash
cd /opt/finance
sudo bash deploy/initial-setup.sh your-domain.com
```

**Replace `your-domain.com`** with your actual domain. If you don't have a domain yet, use your VPS IP address:

```bash
sudo bash deploy/initial-setup.sh 123.45.67.89
```

### What This Script Does Automatically

| Step | What it does |
|------|-------------|
| 1 | Installs Python 3, Node.js 20, PostgreSQL, Nginx, Certbot |
| 2 | Creates a `finance` system user |
| 3 | Creates PostgreSQL database `finance_db` with auto-generated password |
| 4 | Creates Python virtualenv and installs backend dependencies |
| 5 | Generates `.env` file with secure `SECRET_KEY` and DB credentials |
| 6 | Runs Django migrations + collectstatic + creates admin user |
| 7 | Installs frontend dependencies + builds Next.js |
| 8 | Sets up systemd services (auto-start on boot) |
| 9 | Configures Nginx reverse proxy |
| 10 | Sets up daily backup cron job |

### 1.4 SAVE the Output!

> [!CAUTION]
> The script prints your **database password** and **admin credentials** at the end. **Copy and save these somewhere secure** — you won't see them again!

Example output:
```
 Database: finance_db
 DB User:  finance_user
 DB Pass:  a1b2c3d4e5f6g7h8

 ⚠ SAVE THESE CREDENTIALS SECURELY!
```

### 1.5 Review the .env File

```bash
cat /opt/finance/backend/finance_app/.env
```

Verify:
- `ALLOWED_HOSTS` includes your domain/IP
- `CSRF_TRUSTED_ORIGINS` has `https://your-domain.com`
- `CORS_ALLOWED_ORIGINS` has `https://your-domain.com`

If you need to edit:
```bash
nano /opt/finance/backend/finance_app/.env
```

---

## Step 2: Point Your Domain to the VPS

### 2.1 If Domain is Registered at Hostinger

1. Go to **Hostinger Dashboard → Domains → your-domain.com → DNS Zone**
2. Add/Edit these records:

| Type | Name | Value |
|------|------|-------|
| A | @ | `123.45.67.89` (your VPS IP) |
| A | www | `123.45.67.89` (your VPS IP) |

3. Wait 5-30 minutes for DNS to propagate

### 2.2 If Domain is Elsewhere (GoDaddy, Namecheap, etc.)

Go to your domain registrar's DNS settings and add the same A records pointing to your VPS IP.

### 2.3 Verify DNS

```bash
# On your local machine or VPS
ping your-domain.com
```

Should return your VPS IP address.

---

## Step 3: Set Up SSL (HTTPS) — Free with Let's Encrypt

Once DNS is pointing to your VPS:

```bash
sudo certbot --nginx -d your-domain.com
```

Follow the prompts:
1. Enter your email
2. Agree to terms
3. Choose **redirect HTTP to HTTPS** (option 2)

Certbot will:
- Get a free SSL certificate
- Auto-configure Nginx for HTTPS
- Set up auto-renewal

**Verify auto-renewal:**
```bash
sudo certbot renew --dry-run
```

### Update .env for HTTPS

After SSL is working, update the backend `.env`:

```bash
nano /opt/finance/backend/finance_app/.env
```

Make sure these use `https://`:
```
CSRF_TRUSTED_ORIGINS=https://your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

Also update frontend:
```bash
nano /opt/finance/frontend/.env.production.local
```

```
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

Then restart services:
```bash
sudo systemctl restart finance-backend finance-frontend
```

---

## Step 4: Migrate Data from Railway (Optional)

If you have existing data in Railway PostgreSQL that you want to keep:

### 4.1 Export from Railway

```bash
# Get your Railway DATABASE_URL from Railway dashboard
# It looks like: postgres://user:pass@host:port/dbname

pg_dump "postgres://railway-user:railway-pass@railway-host:port/railway-db" \
  --no-owner --no-privileges | gzip > railway_backup.sql.gz
```

### 4.2 Import into VPS

```bash
# Copy the backup to your VPS
scp railway_backup.sql.gz root@123.45.67.89:/tmp/

# On VPS: import the data
cd /tmp
gunzip railway_backup.sql.gz
sudo -u postgres psql finance_db < railway_backup.sql
```

### 4.3 Restart Backend

```bash
sudo systemctl restart finance-backend
```

---

## Step 5: Verify Everything Works

### Check Services Are Running

```bash
sudo systemctl status finance-backend    # Should say "active (running)"
sudo systemctl status finance-frontend   # Should say "active (running)"
sudo systemctl status nginx              # Should say "active (running)"
sudo systemctl status postgresql         # Should say "active (running)"
```

### Check in Browser

| URL | What you should see |
|-----|-------------------|
| `https://your-domain.com/` | Finance app login page |
| `https://your-domain.com/admin/` | Django admin login |

### Check Logs (if something is wrong)

```bash
# Backend logs
sudo journalctl -u finance-backend -f --no-pager -n 50

# Frontend logs
sudo journalctl -u finance-frontend -f --no-pager -n 50

# Nginx logs
sudo tail -f /var/log/nginx/finance_error.log
```

---

## Step 6: Future Deployments (After Code Changes)

When you make changes to the code and push to GitHub, deploy the update with **one command**:

```bash
# SSH into VPS
ssh root@123.45.67.89

# Run the deploy script
sudo -u finance bash /opt/finance/deploy/deploy.sh
```

This script:
1. ✅ Pulls latest code from GitHub
2. ✅ Installs new Python/Node dependencies
3. ✅ Runs database migrations (safe — only adds new columns/tables)
4. ✅ Rebuilds Next.js frontend
5. ✅ Restarts services
6. ❌ Does NOT drop or recreate database — your data is safe

---

## Step 7: Backups

### Automatic Backups

Already set up by the initial script. Daily at 2:00 AM, the VPS runs `pg_dump` and saves compressed backups to `/var/backups/finance_app/`. Keeps the last 30 days.

### Manual Backup

```bash
sudo -u finance bash /opt/finance/deploy/backup-cron.sh
```

### Restore from Backup

```bash
# List available backups
ls -la /var/backups/finance_app/

# Restore a specific backup
gunzip -k /var/backups/finance_app/finance_db_20260311_020000.sql.gz
sudo -u postgres psql finance_db < /var/backups/finance_app/finance_db_20260311_020000.sql
sudo systemctl restart finance-backend
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| SSH into VPS | `ssh root@123.45.67.89` |
| Deploy update | `sudo -u finance bash /opt/finance/deploy/deploy.sh` |
| Restart backend | `sudo systemctl restart finance-backend` |
| Restart frontend | `sudo systemctl restart finance-frontend` |
| Restart Nginx | `sudo systemctl reload nginx` |
| View backend logs | `sudo journalctl -u finance-backend -f` |
| View frontend logs | `sudo journalctl -u finance-frontend -f` |
| Manual backup | `sudo -u finance bash /opt/finance/deploy/backup-cron.sh` |
| Edit backend env | `nano /opt/finance/backend/finance_app/.env` |
| Edit frontend env | `nano /opt/finance/frontend/.env.production.local` |
| Check disk space | `df -h` |
| Check memory | `free -h` |

---

## Troubleshooting

### "502 Bad Gateway" from Nginx
→ Backend or frontend service crashed. Check logs:
```bash
sudo journalctl -u finance-backend -n 30
sudo journalctl -u finance-frontend -n 30
```

### "CSRF verification failed"
→ `CSRF_TRUSTED_ORIGINS` in `.env` doesn't match the URL you're accessing. Must include `https://`:
```
CSRF_TRUSTED_ORIGINS=https://your-domain.com
```

### Frontend shows "Network Error" or can't reach API
→ Check `NEXT_PUBLIC_API_URL` in frontend env:
```bash
cat /opt/finance/frontend/.env.production.local
# Should be: NEXT_PUBLIC_API_URL=https://your-domain.com/api
```
Then rebuild frontend:
```bash
cd /opt/finance/frontend && npm run build
sudo systemctl restart finance-frontend
```

### Can't connect to database
→ Check PostgreSQL is running and env var is correct:
```bash
sudo systemctl status postgresql
cat /opt/finance/backend/finance_app/.env | grep DATABASE
```

### Permission errors
→ Make sure files are owned by the `finance` user:
```bash
sudo chown -R finance:finance /opt/finance
```
