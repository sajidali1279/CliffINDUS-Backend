from datetime import timedelta
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.utils.timezone import localtime
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.admin import SimpleListFilter
from django import forms

from cliffindus_backend.products.models import Product, Order
from cliffindus_backend.users.admin_dashboard import cliffindus_admin_site
from cliffindus_backend.users.models import User, RoleUpgradeRequest

# ==========================================================
# INLINE TABLES
# ==========================================================

class ProductInline(admin.TabularInline):
    model = Product
    extra = 0
    fields = ("name", "price", "created_at")
    readonly_fields = ("name", "price", "created_at")
    can_delete = False
    show_change_link = True


class OrderInline(admin.TabularInline):
    model = Order
    extra = 0
    fields = ("id", "total_price", "status", "created_at")
    readonly_fields = ("id", "total_price", "status", "created_at")
    can_delete = False
    show_change_link = True


class RoleUpgradeRequestInline(admin.TabularInline):
    model = RoleUpgradeRequest
    extra = 0
    fields = ("requested_role", "status", "created_at")
    readonly_fields = ("requested_role", "status", "created_at")
    can_delete = False
    show_change_link = True


# ==========================================================
# CUSTOM FILTER
# ==========================================================

class RecentVerificationFilter(SimpleListFilter):
    title = "Recent Verification"
    parameter_name = "verified_recently"

    def lookups(self, request, model_admin):
        return [
            ("7days", "Verified in last 7 days"),
            ("30days", "Verified in last 30 days"),
            ("unverified", "Unverified users"),
        ]

    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == "7days":
            return queryset.filter(is_verified=True, verified_at__gte=now - timedelta(days=7))
        elif self.value() == "30days":
            return queryset.filter(is_verified=True, verified_at__gte=now - timedelta(days=30))
        elif self.value() == "unverified":
            return queryset.filter(is_verified=False)
        return queryset


# ==========================================================
# ADD USER FORMS
# ==========================================================

class UserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Confirm Password", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ("username", "email", "phone", "role", "admin_type")

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("Passwords do not match.")
        return p2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    class Meta:
        model = User
        fields = "__all__"


# ==========================================================
# USER ADMIN
# ==========================================================

@admin.register(User)
class UserAdmin(admin.ModelAdmin):

    add_form = UserCreationForm
    form = UserChangeForm

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "phone", "role", "admin_type", "password1", "password2"),
        }),
    )

    list_display = (
        "username",
        "email",
        "role_colored",
        "verification_badge",
        "verified_since",
        "total_products",
        "total_orders",
        "last_verified",
        "is_active",
        "last_login",
    )

    list_filter = ("role", "is_verified", "is_active", RecentVerificationFilter)
    search_fields = ("username", "email")
    ordering = ("id",)
    actions = ["verify_users", "unverify_users"]
    readonly_fields = ("verification_summary", "role_colored")

    # ------------------------------------------------------
    # INLINE TABLES
    # ------------------------------------------------------
    def get_inlines(self, request, obj=None):
        if not obj:
            return []
        if obj.role == "wholesaler":
            return [ProductInline, RoleUpgradeRequestInline]
        elif obj.role in ("retailer", "consumer"):
            return [OrderInline, RoleUpgradeRequestInline]
        return [RoleUpgradeRequestInline]


    # ------------------------------------------------------
    # ROLE FORMATTING
    # ------------------------------------------------------
    def role_colored(self, obj):
        colors = {
            "admin": "red",
            "wholesaler": "purple",
            "retailer": "blue",
            "consumer": "green",
        }
        return format_html(
            "<b style='color:{}'>{}</b>",
            colors.get(obj.role, "gray"),
            obj.role.capitalize()
        )

    # ------------------------------------------------------
    # BADGE
    # ------------------------------------------------------
    def verification_badge(self, obj):
        color = "green" if obj.is_verified else "red"
        label = "Verified" if obj.is_verified else "Unverified"
        return format_html(f"<b style='color:{color};'>{label}</b>")

    # ------------------------------------------------------
    # VERIFICATION SUMMARY (DETAIL)
    # ------------------------------------------------------
    def verification_summary(self, obj):
        if not obj.is_verified:
            return format_html("<b style='color:red;'>❌ Unverified</b>")
        admin_name = obj.verified_by.username if obj.verified_by else "Unknown"
        dt = obj.verified_at.strftime("%Y-%m-%d %H:%M") if obj.verified_at else "N/A"
        return format_html(
            "<b style='color:green;'>Verified by {}</b><br><small>{}</small>",
            admin_name, dt
        )

    # ------------------------------------------------------
    # VERIFIED SINCE (LIST)
    # ------------------------------------------------------
    def verified_since(self, obj):
        if not obj.is_verified or not obj.verified_at:
            return "-"
        delta = timezone.now() - obj.verified_at
        if delta.days == 0:
            return "Today"
        return f"{delta.days} days ago"

    # ------------------------------------------------------
    # LAST VERIFIED COLUMN
    # ------------------------------------------------------
    def last_verified(self, obj):
        if not obj.verified_at:
            return "-"
        return obj.verified_at.strftime("%Y-%m-%d %H:%M")

    # ------------------------------------------------------
    # COUNTS
    # ------------------------------------------------------
    def total_products(self, obj):
        return Product.objects.filter(owner=obj).count() if obj.role in ("wholesaler", "retailer") else "-"

    def total_orders(self, obj):
        return Order.objects.filter(user=obj).count() if obj.role in ("retailer", "consumer") else "-"

    # ------------------------------------------------------
    # BULK ACTIONS
    # ------------------------------------------------------
    def verify_users(self, request, queryset):
        for user in queryset:
            user.mark_verified(request.user)
        self.message_user(request, f"{queryset.count()} user(s) verified")

    def unverify_users(self, request, queryset):
        for user in queryset:
            user.mark_unverified(request.user)
        self.message_user(request, f"{queryset.count()} user(s) unverified")


# Replace registration
try:
    cliffindus_admin_site.unregister(User)
except:
    pass

cliffindus_admin_site.register(User, UserAdmin)
