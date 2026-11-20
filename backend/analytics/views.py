from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from projects.models import Project
from .services import calculate_project_analytics, calculate_user_overview_analytics

class ProjectAnalyticsView(APIView):
    """
    Returns analytics, completion metrics, and bottleneck scores for a specific project.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)
        if project.owner != request.user:
            raise PermissionDenied("You do not have permission to view analytics for this project.")

        analytics_data = calculate_project_analytics(project)
        return Response(analytics_data)

class OverallAnalyticsView(APIView):
    """
    Returns global analytics summary across all projects for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        overview_data = calculate_user_overview_analytics(request.user)
        return Response(overview_data)
