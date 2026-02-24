import os
import glob
import subprocess
import logging
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import connection

logger = logging.getLogger(__name__)

BACKUP_DIR = os.getenv('BACKUP_DIR', '/var/backups/finance_app')
MAX_BACKUPS = int(os.getenv('MAX_BACKUPS', '30'))


class Command(BaseCommand):
    help = 'Backup PostgreSQL database using pg_dump'

    def handle(self, *args, **options):
        db = connection.settings_dict

        if db['ENGINE'] != 'django.db.backends.postgresql':
            self.stdout.write(self.style.WARNING(
                'Backup skipped — only PostgreSQL is supported'
            ))
            return

        # Ensure backup directory exists
        os.makedirs(BACKUP_DIR, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(BACKUP_DIR, f'finance_db_{timestamp}.sql.gz')

        # Build pg_dump command
        env = os.environ.copy()
        env['PGPASSWORD'] = db.get('PASSWORD', '')

        cmd = [
            'pg_dump',
            '-h', db.get('HOST', 'localhost'),
            '-p', str(db.get('PORT', '5432')),
            '-U', db.get('USER', 'postgres'),
            '-d', db['NAME'],
            '--no-owner',
            '--no-privileges',
        ]

        try:
            self.stdout.write(f'Creating backup of "{db["NAME"]}" ...')

            # Pipe pg_dump output through gzip
            with open(backup_file, 'wb') as f:
                dump = subprocess.Popen(cmd, stdout=subprocess.PIPE, env=env)
                gzip = subprocess.Popen(
                    ['gzip'], stdin=dump.stdout, stdout=f
                )
                dump.stdout.close()
                gzip.communicate()

                if dump.wait() != 0:
                    raise subprocess.CalledProcessError(dump.returncode, cmd)

            self.stdout.write(self.style.SUCCESS(f'Backup created: {backup_file}'))

            # Rotate old backups — keep only the most recent MAX_BACKUPS
            backups = sorted(glob.glob(os.path.join(BACKUP_DIR, 'finance_db_*.sql.gz')))
            for old in backups[:-MAX_BACKUPS]:
                os.remove(old)
                self.stdout.write(f'Removed old backup: {os.path.basename(old)}')

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(
                'pg_dump or gzip not found. Install postgresql-client.'
            ))
        except Exception as e:
            logger.exception('Database backup failed')
            self.stdout.write(self.style.ERROR(f'Backup failed: {e}'))
