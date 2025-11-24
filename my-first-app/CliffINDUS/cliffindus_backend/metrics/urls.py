from django.urls import path
from .views import AdminMetricsView

urlpatterns = [
    path("", AdminMetricsView.as_view(), name="admin-metrics"),
]
