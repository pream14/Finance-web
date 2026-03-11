# Migrate from Railway/Vercel → Hostinger VPS

Currently Django + PostgreSQL is hosted on **Railway** and the Next.js frontend on **Vercel**. Moving everything to a single **Hostinger VPS**. Most deployment scripts already exist from a previous conversation — this plan focuses on **code changes** to remove Railway/Vercel-specific config and a **detailed hosting guide**.

## Proposed Changes

### Backend

#### [MODIFY] [settings.py](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/backend/finance_app/finance_app/settings.py)

1. Remove Railway URL from `CSRF_TRUSTED_ORIGINS` default
2. Remove `#checking railways db` and `# Railway/Production` comments
3. Remove `# Production (Railway/Render)` comment from database section
4. Tighten `ALLOWED_HOSTS` — read from env instead of `['*']`
5. Tighten CORS — only allow all in DEBUG mode
6. Add production security headers (HSTS, secure cookies) when `DEBUG=False`

```diff
-#checking railways db
+# Build paths inside the project like this: BASE_DIR / 'subdir'.

-ALLOWED_HOSTS = ['*']
+ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

-# Security settings for Railway/Production
+# Security settings
-CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', '...railway.app').split(',')
+CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:8000').split(',')

-CORS_ALLOW_ALL_ORIGINS = True
+CORS_ALLOW_ALL_ORIGINS = DEBUG
+if not DEBUG:
+    CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')

-    # Production (Railway/Render)
+    # Production (VPS)
```

#### [NEW] [.env.production.example](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/backend/finance_app/.env.production.example)

Template with all required env vars.

---

### Frontend

#### [DELETE] [vercel.json](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/frontend/vercel.json)

No longer needed — Nginx handles routing on VPS.

#### [MODIFY] [layout.tsx](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/frontend/app/layout.tsx)

Remove `@vercel/analytics` import and `<Analytics />` component.

#### [MODIFY] [package.json](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/frontend/package.json)

Remove `@vercel/analytics` from dependencies.

---

### Deploy Scripts (already exist — no changes needed)

The `deploy/` folder already has all the necessary files from a previous conversation:
- [nginx.conf](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/deploy/nginx.conf) ✅
- [finance-backend.service](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/deploy/finance-backend.service) ✅
- [finance-frontend.service](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/deploy/finance-frontend.service) ✅
- [deploy.sh](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/deploy/deploy.sh) ✅
- [initial-setup.sh](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/deploy/initial-setup.sh) ✅
- [backup-cron.sh](file:///c:/Users/Pream/OneDrive/Desktop/projects/finance/deploy/backup-cron.sh) ✅

These are all correctly configured for Hostinger VPS.

---

## Verification Plan

### Automated Verification

No existing test suites in this project. Verification will be configuration validation:

```bash
cd backend/finance_app && python -c "import finance_app.settings"
```

This ensures no syntax/import errors after settings.py changes.

### Manual Verification

> [!NOTE]
> Full deployment testing can only happen on your actual Hostinger VPS. After making the code changes, I'll provide a complete step-by-step hosting guide.

1. Push code to GitHub
2. Follow the VPS hosting guide to deploy
3. Visit `http://your-domain.com/admin/` — Django admin login should appear
4. Visit `http://your-domain.com/` — Finance app login should appear
5. Log in and verify dashboard loads with data
