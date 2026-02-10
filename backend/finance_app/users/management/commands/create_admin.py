from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create admin user if it does not exist'

    def handle(self, *args, **options):
        User = get_user_model()
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        
        if created:
            admin_user.set_password('admin123')
            admin_user.role = 'owner'
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Admin user created successfully with owner role'))
        else:
            # Update existing admin to ensure it has owner role and correct password
            admin_user.role = 'owner'
            admin_user.set_password('admin123')  # Reset password to known value
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Admin user updated with owner role'))
