from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Task
from .serializers import TaskSerializer
from projects.models import Project
from activity.services import log_activity
from dependencies.services import get_blocked_task_ids_for_project

class ProjectTaskListCreateView(generics.ListCreateAPIView):
    """
    List tasks in a project or create a new task in the project.
    Supports filtering by status, priority, and sorting.
    """
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        if project.owner != self.request.user:
            raise PermissionDenied("You do not have permission to access tasks in this project.")
        return project

    def get_queryset(self):
        project = self.get_project()
        queryset = Task.objects.filter(project=project).select_related('project')

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            if status_param == 'blocked':
                blocked_ids = get_blocked_task_ids_for_project(project.id)
                queryset = queryset.filter(id__in=blocked_ids)
            elif status_param == 'overdue':
                now = timezone.now()
                queryset = queryset.filter(status__in=[Task.STATUS_TODO, Task.STATUS_IN_PROGRESS], due_date__lt=now)
            elif status_param in [Task.STATUS_TODO, Task.STATUS_IN_PROGRESS, Task.STATUS_COMPLETED]:
                queryset = queryset.filter(status=status_param)

        # Filter by priority
        priority_param = self.request.query_params.get('priority')
        if priority_param in [Task.PRIORITY_LOW, Task.PRIORITY_MEDIUM, Task.PRIORITY_HIGH]:
            queryset = queryset.filter(priority=priority_param)

        # Search filter
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(title__icontains=search_query)

        # Sorting
        sort_by = self.request.query_params.get('sort_by', '-created_at')
        allowed_sorts = {
            'due_date': 'due_date',
            '-due_date': '-due_date',
            'created_at': 'created_at',
            '-created_at': '-created_at',
            'priority': 'priority',
            'title': 'title',
        }
        order_field = allowed_sorts.get(sort_by, '-created_at')
        return queryset.order_field_if_valid(order_field) if hasattr(queryset, 'order_field_if_valid') else queryset.order_by(order_field)

    def perform_create(self, serializer):
        project = self.get_project()
        task = serializer.save(project=project)
        log_activity(
            project=project,
            user=self.request.user,
            action='task_created',
            description=f"Created task '{task.title}'",
            entity_type='task',
            entity_id=task.id
        )

class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update (PATCH) or delete a task.
    """
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Task.objects.filter(project__owner=self.request.user)

    def perform_update(self, serializer):
        previous_status = self.get_object().status
        task = serializer.save()

        # Check if completed
        if previous_status != Task.STATUS_COMPLETED and task.status == Task.STATUS_COMPLETED:
            action = 'task_completed'
            desc = f"Completed task '{task.title}'"
        else:
            action = 'task_updated'
            desc = f"Updated task '{task.title}'"

        log_activity(
            project=task.project,
            user=self.request.user,
            action=action,
            description=desc,
            entity_type='task',
            entity_id=task.id
        )

    def perform_destroy(self, instance):
        project = instance.project
        task_id = instance.id
        task_title = instance.title

        log_activity(
            project=project,
            user=self.request.user,
            action='task_deleted',
            description=f"Deleted task '{task_title}' (ID: {task_id})",
            entity_type='task',
            entity_id=task_id
        )
        instance.delete()
