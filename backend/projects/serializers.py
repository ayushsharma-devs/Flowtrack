from rest_framework import serializers
from django.utils import timezone
from .models import Project
from dependencies.services import get_blocked_task_ids_for_project

class ProjectSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    completion_percentage = serializers.SerializerMethodField()
    total_tasks = serializers.SerializerMethodField()
    completed_tasks = serializers.SerializerMethodField()
    in_progress_tasks = serializers.SerializerMethodField()
    todo_tasks = serializers.SerializerMethodField()
    blocked_tasks = serializers.SerializerMethodField()
    overdue_tasks = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id',
            'owner',
            'owner_username',
            'title',
            'description',
            'deadline',
            'created_at',
            'updated_at',
            'completion_percentage',
            'total_tasks',
            'completed_tasks',
            'in_progress_tasks',
            'todo_tasks',
            'blocked_tasks',
            'overdue_tasks',
            'user_role',
            'members_count',
        ]
        read_only_fields = ('id', 'owner', 'created_at', 'updated_at')

    def get_completion_percentage(self, obj):
        return obj.completion_percentage

    def get_total_tasks(self, obj):
        return obj.tasks.count()

    def get_completed_tasks(self, obj):
        return obj.tasks.filter(status='completed').count()

    def get_in_progress_tasks(self, obj):
        return obj.tasks.filter(status='in_progress').count()

    def get_todo_tasks(self, obj):
        return obj.tasks.filter(status='todo').count()

    def get_blocked_tasks(self, obj):
        return len(get_blocked_task_ids_for_project(obj.id))

    def get_overdue_tasks(self, obj):
        now = timezone.now()
        return obj.tasks.filter(status__in=['todo', 'in_progress'], due_date__lt=now).count()

    def get_user_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None
        from members.permissions import get_user_role
        return get_user_role(request.user, obj)

    def get_members_count(self, obj):
        # Total members plus the owner
        return obj.members.count() + 1
