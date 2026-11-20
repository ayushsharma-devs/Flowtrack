from rest_framework import serializers
from .models import Task
from dependencies.services import check_task_completion_eligibility, is_task_blocked

class TaskPrerequisiteBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'status', 'priority']

class TaskSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source='project.title', read_only=True)
    is_blocked = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    prerequisites = serializers.SerializerMethodField()
    dependents = serializers.SerializerMethodField()
    bottleneck_score = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id',
            'project',
            'project_title',
            'title',
            'description',
            'status',
            'priority',
            'due_date',
            'created_at',
            'updated_at',
            'completed_at',
            'is_blocked',
            'is_overdue',
            'prerequisites',
            'dependents',
            'bottleneck_score',
        ]
        read_only_fields = ('id', 'project', 'created_at', 'updated_at', 'completed_at')

    def get_is_blocked(self, obj):
        return is_task_blocked(obj)

    def get_is_overdue(self, obj):
        return obj.is_overdue

    def get_prerequisites(self, obj):
        prereqs = [dep.prerequisite_task for dep in obj.upstream_dependencies.select_related('prerequisite_task')]
        return TaskPrerequisiteBriefSerializer(prereqs, many=True).data

    def get_dependents(self, obj):
        deps = [dep.dependent_task for dep in obj.downstream_dependencies.select_related('dependent_task')]
        return TaskPrerequisiteBriefSerializer(deps, many=True).data

    def get_bottleneck_score(self, obj):
        downstream_count = obj.downstream_dependencies.count()
        overdue_flag = 1 if obj.is_overdue else 0
        return downstream_count + (2 * overdue_flag)

    def validate(self, attrs):
        new_status = attrs.get('status')
        # If task is being marked as completed, verify all prerequisites are completed
        if new_status == Task.STATUS_COMPLETED:
            if self.instance:
                check_task_completion_eligibility(self.instance)
        return attrs
