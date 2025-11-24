from django.db import migrations

def promote_superusers(apps, schema_editor):
    User = apps.get_model("users", "User")

    for user in User.objects.filter(is_superuser=True):
        user.role = "admin"
        user.admin_type = "super_admin"
        user.is_verified = True
        user.save()

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),  # Django will auto-correct this to last migration
    ]

    operations = [
        migrations.RunPython(promote_superusers),
    ]
