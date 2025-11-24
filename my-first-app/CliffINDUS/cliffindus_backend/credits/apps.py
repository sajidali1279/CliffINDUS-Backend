from django.apps import AppConfig

class CreditsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cliffindus_backend.credits"
    label = "cliffindus_credits"  # ✅ must say this, not "credits"

    def ready(self):
        import cliffindus_backend.credits.signals
