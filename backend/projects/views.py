from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Project
from .serializers import ProjectSerializer
from activity.services import log_activity

class ProjectListCreateView(generics.ListCreateAPIView):
    """
    List user's projects or create a new project.
    Only exposes projects owned by the authenticated user.
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)
        log_activity(
            project=project,
            user=self.request.user,
            action='project_created',
            description=f"Created project '{project.title}'",
            entity_type='project',
            entity_id=project.id
        )

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a specific project.
    Strictly isolated to projects owned by the authenticated user.
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def perform_update(self, serializer):
        project = serializer.save()
        log_activity(
            project=project,
            user=self.request.user,
            action='project_updated',
            description=f"Updated project '{project.title}'",
            entity_type='project',
            entity_id=project.id
        )

    def perform_destroy(self, instance):
        project_id = instance.id
        title = instance.title
        # Delete project (cascades to tasks, dependencies, activity records)
        instance.delete()
