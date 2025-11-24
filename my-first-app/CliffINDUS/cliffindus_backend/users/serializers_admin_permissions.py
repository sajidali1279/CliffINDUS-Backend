from rest_framework import serializers
from .models import AdminPermission

class AdminPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminPermission
        fields = "__all__"
        read_only_fields = ["admin"]
