from django.db import models

class TaskDependency(models.Model):
    prerequisite_task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='downstream_dependencies',
        help_text="The task that must be completed first."
    )
    dependent_task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='upstream_dependencies',
        help_text="The task that depends on the prerequisite task."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['prerequisite_task', 'dependent_task'],
                name='unique_task_dependency'
            )
        ]
        indexes = [
            models.Index(fields=['prerequisite_task', 'dependent_task']),
            models.Index(fields=['dependent_task']),
        ]

    def __str__(self):
        return f"Task {self.prerequisite_task_id} -> Task {self.dependent_task_id}"
