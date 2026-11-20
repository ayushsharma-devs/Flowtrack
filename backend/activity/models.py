from django.db import models
from django.contrib.auth.models import User

class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('project_created', 'Project Created'),
        ('project_updated', 'Project Updated'),
        ('project_deleted', 'Project Deleted'),
        ('task_created', 'Task Created'),
        ('task_updated', 'Task Updated'),
        ('task_completed', 'Task Completed'),
        ('task_deleted', 'Task Deleted'),
        ('dependency_added', 'Dependency Added'),
        ('dependency_removed', 'Dependency Removed'),
    ]

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='activities'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField()
    entity_type = models.CharField(max_length=50)  # project, task, dependency
    entity_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.action}] {self.description[:50]}"
