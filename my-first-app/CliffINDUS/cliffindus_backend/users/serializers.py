from rest_framework import serializers
from django.db.models import Q
from .models import User, RoleUpgradeRequest, AdminPermission

# --------------------------------------------------------
# ✅ USER SERIALIZER (Supports Registration with Password)
# --------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    verified_info = serializers.CharField(source="get_verification_info", read_only=True)
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "address",
            "role",
            "is_verified",
            "verified_info",
            "password",
        ]
        read_only_fields = ["is_verified", "verified_info"]

    def validate(self, attrs):
        email = attrs.get("email")
        phone = attrs.get("phone")

        if not email or not phone:
            raise serializers.ValidationError("Both email and phone are required.")

        # Enforce unique combination rule
        existing = User.objects.filter(Q(email=email) | Q(phone=phone))
        if self.instance:
            existing = existing.exclude(id=self.instance.id)

        if existing.exists():
            match = existing.first()
            if match.email == email and match.phone != phone:
                raise serializers.ValidationError(
                    "Email already registered with another phone number."
                )
            if match.phone == phone and match.email != email:
                raise serializers.ValidationError(
                    "Phone already registered with another email."
                )
            raise serializers.ValidationError(
                "This email/phone combination already exists."
            )

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user


# --------------------------------------------------------
# ✅ ADMIN PERMISSION SERIALIZER
# --------------------------------------------------------
class AdminPermissionSerializer(serializers.ModelSerializer):
    admin_username = serializers.CharField(source="admin.username", read_only=True)

    class Meta:
        model = AdminPermission
        fields = [
            "id",
            "admin",
            "admin_username",
            "can_manage_users",
            "can_view_role_requests",
            "can_approve_role_requests",
            "created_at",
            "updated_at",
        ]


# --------------------------------------------------------
# ✅ ROLE UPGRADE REQUEST SERIALIZER
# --------------------------------------------------------
class RoleUpgradeRequestSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    requested_role_display = serializers.CharField(
        source="get_requested_role_display", read_only=True
    )

    class Meta:
        model = RoleUpgradeRequest
        fields = [
            "id",
            "user",
            "requested_role",
            "requested_role_display",
            "business_name",
            "business_license",
            "status",
            "admin_comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["status", "admin_comment", "created_at", "updated_at"]
