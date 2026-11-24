from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import Project
from .serializers import ProjectSerializer
from activity.services import log_activity
from members.permissions import can_edit_project


class ProjectListCreateView(generics.ListCreateAPIView):
    """
    List user's projects (owned or member of) or create a new project.
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

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
    Accessible to the owner and all project members.
    Only editors+ can update; only the owner can delete.
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(
            Q(owner=user) | Q(members__user=user)
        ).distinct()

    def perform_update(self, serializer):
        project = self.get_object()
        if not can_edit_project(self.request.user, project):
            raise PermissionDenied("You do not have permission to edit this project.")
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
        if instance.owner_id != self.request.user.id:
            raise PermissionDenied("Only the project owner can delete this project.")
        instance.delete()
