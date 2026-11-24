from rest_framework import serializers
from .models import TaskDependency
from tasks.models import Task
from .services import validate_dependency_rules

class TaskDependencySerializer(serializers.ModelSerializer):
    prerequisite_title = serializers.CharField(source='prerequisite_task.title', read_only=True)
    dependent_title = serializers.CharField(source='dependent_task.title', read_only=True)

    class Meta:
        model = TaskDependency
        fields = [
            'id',
            'prerequisite_task',
            'prerequisite_title',
            'dependent_task',
            'dependent_title',
            'created_at',
        ]
        read_only_fields = ('id', 'created_at')
        validators = []

    def validate(self, attrs):
        prerequisite_task = attrs.get('prerequisite_task')
        dependent_task = attrs.get('dependent_task')

        # Check authorization - user must have edit permissions on both projects
        user = self.context['request'].user
        from members.permissions import can_edit_project
        if not can_edit_project(user, prerequisite_task.project) or not can_edit_project(user, dependent_task.project):
            raise serializers.ValidationError("You do not have permission to link tasks in this project.")

        # Execute dependency rules and cycle detection
        validate_dependency_rules(prerequisite_task, dependent_task)

        return attrs
