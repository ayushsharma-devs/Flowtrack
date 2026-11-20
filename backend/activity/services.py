from .models import ActivityLog

def log_activity(project, user, action, description, entity_type, entity_id=None):
    """
    Helper function to safely record activity logs.
    """
    try:
        return ActivityLog.objects.create(
            project=project,
            user=user if user and user.is_authenticated else None,
            action=action,
            description=description,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    except Exception as e:
        # Avoid crashing primary operations if activity logging encounters an error
        return None
