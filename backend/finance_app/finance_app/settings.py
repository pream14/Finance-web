import os
from dotenv import load_dotenv

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv()

# Basic settings
# Basic settings  
DEBUG = os.getenv('DEBUG', 'False') == 'True'
SECRET_KEY = os.getenv('SECRET_KEY', 'your-dev-secret-key')  # Use a proper key in production
ALLOWED_HOSTS = ['*']  # Allow all hosts for now, secure in production later

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
    'users',
    'customers',
    'transactions',
    'expenses',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Add this before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
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
    ],}


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
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS =True  # Set to False in production
CORS_ALLOWED_ORIGINS = [
    "http://192.168.173.233:8081",  # Add your React Native app domain in production
]

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