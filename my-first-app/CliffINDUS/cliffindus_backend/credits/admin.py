from django.contrib import admin
from .models import CreditTransaction

@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "points",
        "created_at",   # matches your model field name (timestamp equivalent)
               # only include this if your model has it
    )
    search_fields = ("user__username",)
    ordering = ("-created_at",)
