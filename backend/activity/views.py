from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from projects.models import Project

class RecentActivityListView(generics.ListAPIView):
    """
    Returns recent activity logs across all projects owned by the authenticated user.
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ActivityLog.objects.filter(
            project__owner=self.request.user
        ).select_related('project', 'user')[:50]

class ProjectActivityListView(generics.ListAPIView):
    """
    Returns activity logs for a specific project owned by the authenticated user.
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        if project.owner != self.request.user:
            raise PermissionDenied("You do not have permission to view activity for this project.")
        return ActivityLog.objects.filter(
            project=project
        ).select_related('project', 'user')[:100]
