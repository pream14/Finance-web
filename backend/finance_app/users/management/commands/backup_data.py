from django.core.management.base import BaseCommand
from django.db import connection
import os
from datetime import datetime

class Command(BaseCommand):
    help = 'Backup database before migrations'

    def handle(self, *args, **options):
        try:
            # Create backup filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = f'/tmp/backup_{timestamp}.sql'
            
            # Get database connection info
            db_name = connection.settings_dict['NAME']
            
            self.stdout.write(f'Creating backup of {db_name}...')
            
            # Create backup using pg_dump
            os.system(f'pg_dump {db_name} > {backup_file}')
            
            self.stdout.write(self.style.SUCCESS(f'Backup created: {backup_file}'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Backup failed: {str(e)}'))
