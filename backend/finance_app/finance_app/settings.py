import os
from dotenv import load_dotenv

from pathlib import Path
#checking railways db
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv()

# Basic settings
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# Security: SECRET_KEY must be set in production via environment variable.
# In development (DEBUG=True), a dev-only key is used as fallback.
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if not DEBUG:
        raise ValueError(
            "SECURITY ERROR: SECRET_KEY environment variable is not set! "
            "This is required in production. Generate one with: "
            "python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
        )
    SECRET_KEY = 'dev-only-insecure-key-do-not-use-in-production'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')

# Security settings for Railway/Production
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:8000,https://senthur.tech,https://www.senthur.tech').split(',')
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Root URL conf
ROOT_URLCONF = 'finance_app.urls'  # Adjust if your project name is different

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework.authtoken',  
    'corsheaders', 
    
    # Local apps
    'organizations',
    'users',
    'customers',
    'transactions',
    'expenses',
]

class ExemptCSRFMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api-auth/token/'):
            request._dont_enforce_csrf_checks = True
        return self.get_response(request)

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Add this before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'finance_app.settings.ExemptCSRFMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Rate limiting to prevent brute-force attacks
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',     # Unauthenticated requests (login attempts, etc.)
        'user': '120/minute',    # Authenticated user requests
    },
}


# Templates configuration
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI application
WSGI_APPLICATION = 'finance_app.wsgi.application'  # Adjust if your project name is different

# CORS settings
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'False') == 'True'
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')

# Database settings
# Database settings
# Database settings
import dj_database_url

DATABASES = {}

if os.getenv('DATABASE_URL'):
    # Production (Railway/Render)
    DATABASES['default'] = dj_database_url.config(conn_max_age=600)
elif os.getenv('DATABASE_NAME'):
    # Local Development with Postgres variables
    DATABASES['default'] = {
        'ENGINE': os.getenv('DATABASE_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DATABASE_NAME'),
        'USER': os.getenv('DATABASE_USER'),
        'PASSWORD': os.getenv('DATABASE_PASSWORD'),
        'HOST': os.getenv('DATABASE_HOST'),
        'PORT': os.getenv('DATABASE_PORT'),
    }
else:
    # Fallback (Build process or no config)
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }

# Custom user model
AUTH_USER_MODEL = 'users.User'

# Password validation — enforces strong passwords for new accounts & password changes.
# NOTE: This does NOT affect existing users or their current passwords.
# It only applies when a password is SET or CHANGED.
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]



# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Production Security Headers ─────────────────────────────────────────────
# These are only active when DEBUG=False (production).
# They protect against MITM attacks, cookie hijacking, clickjacking, and XSS.
if not DEBUG:
    # HSTS: Tell browsers to always use HTTPS (for 1 year)
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Redirect all HTTP requests to HTTPS
    SECURE_SSL_REDIRECT = True

    # Cookies: only sent over HTTPS
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # Prevent browsers from MIME-type sniffing
    SECURE_CONTENT_TYPE_NOSNIFF = True

    # Clickjacking protection
    X_FRAME_OPTIONS = 'DENY'
