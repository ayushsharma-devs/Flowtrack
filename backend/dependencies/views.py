from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from .models import TaskDependency
from .serializers import TaskDependencySerializer
from tasks.models import Task
from projects.models import Project
from activity.services import log_activity
from .services import get_blocked_task_ids_for_project
from members.permissions import is_project_accessible, can_edit_project

class DependencyCreateView(generics.CreateAPIView):
    """
    Creates a new dependency relationship between two tasks.
    Validates self-dependency, cross-project dependency, duplicates, and cycles.
    """
    serializer_class = TaskDependencySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        dep = serializer.save()
        log_activity(
            project=dep.prerequisite_task.project,
            user=self.request.user,
            action='dependency_added',
            description=f"Added dependency: Task '{dep.dependent_task.title}' depends on Task '{dep.prerequisite_task.title}'",
            entity_type='dependency',
            entity_id=dep.id
        )

class DependencyDeleteView(generics.DestroyAPIView):
    """
    Deletes an existing task dependency relationship.
    """
    serializer_class = TaskDependencySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        return TaskDependency.objects.filter(
            Q(prerequisite_task__project__owner=user) | Q(prerequisite_task__project__members__user=user)
        ).distinct()

    def perform_destroy(self, instance):
        project = instance.prerequisite_task.project
        if not can_edit_project(self.request.user, project):
            raise PermissionDenied("You do not have permission to delete dependencies in this project.")
        dep_id = instance.id
        prereq_title = instance.prerequisite_task.title
        dep_title = instance.dependent_task.title

        log_activity(
            project=project,
            user=self.request.user,
            action='dependency_removed',
            description=f"Removed dependency: Task '{dep_title}' no longer depends on Task '{prereq_title}'",
            entity_type='dependency',
            entity_id=dep_id
        )
        instance.delete()

class ProjectGraphView(APIView):
    """
    Returns the task dependency graph for React Flow visualization.
    Nodes represent tasks with status, priority, blocked, and overdue flags.
    Edges represent directed dependencies from prerequisite to dependent task.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)
        if not is_project_accessible(request.user, project):
            raise PermissionDenied("You do not have permission to view this project's graph.")

        tasks = list(Task.objects.filter(project=project))
        dependencies = list(
            TaskDependency.objects.filter(prerequisite_task__project=project)
            .select_related('prerequisite_task', 'dependent_task')
        )

        now = timezone.now()
        blocked_task_ids = get_blocked_task_ids_for_project(project.id)

        # Count downstream tasks for bottleneck calculation
        downstream_counts = {}
        upstream_counts = {}
        for dep in dependencies:
            downstream_counts[dep.prerequisite_task_id] = downstream_counts.get(dep.prerequisite_task_id, 0) + 1
            upstream_counts[dep.dependent_task_id] = upstream_counts.get(dep.dependent_task_id, 0) + 1

        nodes = []
        for task in tasks:
            is_overdue = bool(task.status != Task.STATUS_COMPLETED and task.due_date and task.due_date < now)
            overdue_flag = 1 if is_overdue else 0
            downstream_count = downstream_counts.get(task.id, 0)
            upstream_count = upstream_counts.get(task.id, 0)
            bottleneck_score = downstream_count + (2 * overdue_flag)

            nodes.append({
                "id": str(task.id),
                "type": "customTaskNode",
                "position": {"x": 0, "y": 0},  # layout is computed dynamically on frontend with Dagre
                "data": {
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "status": task.status,
                    "priority": task.priority,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "created_at": task.created_at.isoformat(),
                    "is_blocked": task.id in blocked_task_ids,
                    "is_overdue": is_overdue,
                    "bottleneck_score": bottleneck_score,
                    "prerequisite_count": upstream_count,
                    "dependent_count": downstream_count,
                }
            })

        edges = []
        for dep in dependencies:
            edges.append({
                "id": f"e-{dep.prerequisite_task_id}-{dep.dependent_task_id}",
                "source": str(dep.prerequisite_task_id),
                "target": str(dep.dependent_task_id),
                "dependency_id": dep.id,
                "animated": dep.prerequisite_task.status != Task.STATUS_COMPLETED,
            })

        return Response({
            "project_id": project.id,
            "project_title": project.title,
            "nodes": nodes,
            "edges": edges,
        })
