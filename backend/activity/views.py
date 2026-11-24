from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from projects.models import Project
from members.permissions import is_project_accessible

class RecentActivityListView(generics.ListAPIView):
    """
    Returns recent activity logs across all projects accessible by the authenticated user.
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ActivityLog.objects.filter(
            Q(project__owner=self.request.user) | Q(project__members__user=self.request.user)
        ).distinct().select_related('project', 'user')[:50]

class ProjectActivityListView(generics.ListAPIView):
    """
    Returns activity logs for a specific project.
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        if not is_project_accessible(self.request.user, project):
            raise PermissionDenied("You do not have permission to view activity for this project.")
        return ActivityLog.objects.filter(
            project=project
        ).select_related('project', 'user')[:100]
