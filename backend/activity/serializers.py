from rest_framework import serializers
from .models import ActivityLog

class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default='System')
    project_title = serializers.CharField(source='project.title', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'project',
            'project_title',
            'user',
            'username',
            'action',
            'description',
            'entity_type',
            'entity_id',
            'created_at',
        ]
        read_only_fields = fields
