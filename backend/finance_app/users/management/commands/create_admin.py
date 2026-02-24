import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Create admin user if it does not exist (first-time setup only)'

    def handle(self, *args, **options):
        User = get_user_model()

        username = os.getenv('ADMIN_USERNAME', 'admin')
        password = os.getenv('ADMIN_PASSWORD', 'changeme')
        email = os.getenv('ADMIN_EMAIL', 'admin@example.com')

        admin_user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'is_staff': True,
                'is_superuser': True,
                'role': 'owner',
            }
        )

        if created:
            admin_user.set_password(password)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(
                f'Admin user "{username}" created successfully with owner role'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Admin user "{username}" already exists — skipping'
            ))
