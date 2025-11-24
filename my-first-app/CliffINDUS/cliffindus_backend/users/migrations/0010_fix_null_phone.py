from django.db import migrations

def fix_phone_numbers(apps, schema_editor):
    User = apps.get_model("users", "User")

    for user in User.objects.all():
        if not user.phone or user.phone.strip() == "":
            user.phone = "0000000000"
            user.save()

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_set_admin_types'),
    ]

    operations = [
        migrations.RunPython(fix_phone_numbers),
    ]
