from .models import ProjectMember


def get_user_role(user, project):
    """
    Returns the user's effective role in a project.
    Possible return values: 'owner', 'admin', 'editor', 'viewer', or None.
    """
    if project.owner_id == user.id:
        return 'owner'

    try:
        membership = ProjectMember.objects.get(project=project, user=user)
        return membership.role
    except ProjectMember.DoesNotExist:
        return None


def is_project_accessible(user, project):
    """Returns True if the user is the owner or any kind of member."""
    if project.owner_id == user.id:
        return True
    return ProjectMember.objects.filter(project=project, user=user).exists()


def can_edit_project(user, project):
    """Returns True if the user can edit project content (owner, admin, or editor)."""
    role = get_user_role(user, project)
    return role in ('owner', 'admin', 'editor')


def can_manage_members(user, project):
    """Returns True if the user can invite/remove members (owner or admin)."""
    role = get_user_role(user, project)
    return role in ('owner', 'admin')
