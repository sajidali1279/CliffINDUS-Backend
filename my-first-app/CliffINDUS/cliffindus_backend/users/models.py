from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q


# --------------------------------------------------------
# ✅ CUSTOM USER MODEL
# --------------------------------------------------------
class User(AbstractUser):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("wholesaler", "Wholesaler"),
        ("retailer", "Retailer"),
        ("consumer", "Consumer"),
    ]

    ADMIN_TYPE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("admin", "Admin"),
        ("none", "None"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="consumer")
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255, blank=True, null=True)

    is_verified = models.BooleanField(default=False)

    # Admin level (super admin or admin)
    admin_type = models.CharField(
        max_length=20,
        choices=ADMIN_TYPE_CHOICES,
        default="none",
    )

    # Verification audit fields
    verified_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_users",
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    def clean(self):
        """Prevent duplicate phone/email mismatches."""
        if not self.email or not self.phone:
            raise ValidationError("Both email and phone are required.")

        existing = User.objects.filter(
            Q(email=self.email) | Q(phone=self.phone)
        ).exclude(id=self.id)

        if existing.exists():
            match = existing.first()
            if match.email == self.email and match.phone != self.phone:
                raise ValidationError("Email already registered with another phone.")
            if match.phone == self.phone and match.email != self.email:
                raise ValidationError("Phone already registered with another email.")
            raise ValidationError("This email/phone combination already exists.")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # Auto-create AdminPermission for admin roles
        from .models import AdminPermission
        if self.admin_type in ["admin", "super_admin"]:
            AdminPermission.objects.get_or_create(admin=self)

    # Verification helpers
    def mark_verified(self, admin_user=None):
        self.is_verified = True
        self.verified_by = admin_user
        self.verified_at = timezone.now()
        self.save(update_fields=["is_verified", "verified_by", "verified_at"])

    def mark_unverified(self, admin_user=None):
        self.is_verified = False
        self.verified_by = admin_user
        self.verified_at = None
        self.save(update_fields=["is_verified", "verified_by", "verified_at"])

    def get_verification_info(self):
        if not self.is_verified:
            return "❌ Unverified"
        admin = self.verified_by.username if self.verified_by else "Unknown"
        time = self.verified_at.strftime("%Y-%m-%d %H:%M UTC") if self.verified_at else "N/A"
        return f"✅ Verified by {admin} on {time}"

    def __str__(self):
        return f"{self.username} ({self.role}, {self.admin_type})"


# --------------------------------------------------------
# ✅ ROLE UPGRADE REQUEST MODEL
# --------------------------------------------------------
class RoleUpgradeRequest(models.Model):
    ROLE_CHOICES = [
        ("retailer", "Retailer"),
        ("wholesaler", "Wholesaler"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="upgrade_requests",
    )

    requested_role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    business_name = models.CharField(max_length=255, blank=True, null=True)
    business_license = models.FileField(upload_to="licenses/", blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="pending",
    )

    admin_comment = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Approve request
    def approve(self, admin_user=None, comment=None):
        self.status = "approved"
        self.admin_comment = comment or ""
        self.save(update_fields=["status", "admin_comment"])

        # Apply role + verification
        self.user.role = self.requested_role
        self.user.mark_verified(admin_user)

    def reject(self, admin_user=None, comment=None):
        self.status = "rejected"
        self.admin_comment = comment or ""
        self.save(update_fields=["status", "admin_comment"])

    def __str__(self):
        return f"{self.user.username} → {self.requested_role} ({self.status})"

    class Meta:
        verbose_name = "Role Upgrade Request"
        verbose_name_plural = "Role Upgrade Requests"
        ordering = ["-created_at"]


# --------------------------------------------------------
# ✅ ADMIN PERMISSION MODEL
# --------------------------------------------------------
class AdminPermission(models.Model):
    admin = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="admin_permissions",
    )

    # Flags
    can_manage_users = models.BooleanField(default=True)
    can_view_role_requests = models.BooleanField(default=True)
    can_approve_role_requests = models.BooleanField(default=False)  # only super_admin

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Permissions for {self.admin.username}"

    class Meta:
        verbose_name = "Admin Permission"
        verbose_name_plural = "Admin Permissions"
