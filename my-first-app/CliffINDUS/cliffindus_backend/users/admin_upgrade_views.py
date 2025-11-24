from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from cliffindus_backend.users.models import RoleUpgradeRequest
from cliffindus_backend.users.admin_views import RoleUpgradeRequestSerializer
from cliffindus_backend.users.permissions import IsAdminOrSuperAdmin


class AdminUpgradeRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin-only endpoint to list and manage role upgrade requests.
    """
    queryset = RoleUpgradeRequest.objects.all().order_by("-created_at")
    serializer_class = RoleUpgradeRequestSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        req = self.get_object()
        comment = request.data.get("admin_comment", "")
        req.approve(admin_user=request.user, comment=comment)
        return Response(
            {
                "detail": "Role upgrade approved.",
                "request": RoleUpgradeRequestSerializer(req).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        req = self.get_object()
        comment = request.data.get("admin_comment", "")
        req.reject(admin_user=request.user, comment=comment)
        return Response(
            {
                "detail": "Role upgrade rejected.",
                "request": RoleUpgradeRequestSerializer(req).data,
            },
            status=status.HTTP_200_OK,
        )
