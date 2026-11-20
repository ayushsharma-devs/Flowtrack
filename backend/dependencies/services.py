from collections import defaultdict
from rest_framework.exceptions import ValidationError
from .models import TaskDependency
from tasks.models import Task

def find_path_dfs(start_task_id, target_task_id, project_id):
    """
    Performs Depth First Search (DFS) to find if a directed path exists
    from start_task_id to target_task_id in the project's dependency graph.
    Returns (path_exists: bool, path: list of task_ids).
    """
    # Fetch all dependencies within the project
    dependencies = TaskDependency.objects.filter(
        prerequisite_task__project_id=project_id
    ).values_list('prerequisite_task_id', 'dependent_task_id')

    adj = defaultdict(list)
    for prereq_id, dep_id in dependencies:
        adj[prereq_id].append(dep_id)

    visited = set()
    stack = [(start_task_id, [start_task_id])]

    while stack:
        curr, path = stack.pop()
        if curr == target_task_id:
            return True, path

        if curr not in visited:
            visited.add(curr)
            for neighbor in adj.get(curr, []):
                if neighbor not in visited:
                    stack.append((neighbor, path + [neighbor]))

    return False, []

def validate_dependency_rules(prerequisite_task, dependent_task):
    """
    Enforces all FlowTrack dependency validation rules before creating an edge:
    1. A task cannot depend on itself.
    2. Tasks from different projects cannot be linked.
    3. Duplicate dependency relationships are prohibited.
    4. Circular dependencies must be prevented via DFS.
    """
    # Rule 1: Self dependency
    if prerequisite_task.id == dependent_task.id:
        raise ValidationError({"non_field_errors": ["A task cannot depend on itself."]})

    # Rule 2: Cross-project dependency
    if prerequisite_task.project_id != dependent_task.project_id:
        raise ValidationError({
            "non_field_errors": [
                f"Cross-project dependencies are prohibited. Prerequisite task belongs to project {prerequisite_task.project_id}, but dependent task belongs to project {dependent_task.project_id}."
            ]
        })

    # Rule 3: Duplicate dependency
    if TaskDependency.objects.filter(prerequisite_task=prerequisite_task, dependent_task=dependent_task).exists():
        raise ValidationError({
            "non_field_errors": [
                f"Dependency relationship already exists: Task '{prerequisite_task.title}' (ID: {prerequisite_task.id}) is already a prerequisite of Task '{dependent_task.title}' (ID: {dependent_task.id})."
            ]
        })

    # Rule 4: Cycle detection
    # An edge A -> B means B depends on A.
    # If there is already a path from B to A (B -> ... -> A), then adding A -> B forms a cycle: A -> B -> ... -> A.
    has_cycle, cycle_path = find_path_dfs(
        start_task_id=dependent_task.id,
        target_task_id=prerequisite_task.id,
        project_id=prerequisite_task.project_id
    )

    if has_cycle:
        full_cycle_str = " -> ".join(str(tid) for tid in (cycle_path + [dependent_task.id]))
        raise ValidationError({
            "non_field_errors": [
                f"Circular dependency detected! A path already exists from dependent Task {dependent_task.id} to prerequisite Task {prerequisite_task.id}. Adding this dependency would create a cycle: [{full_cycle_str}]."
            ]
        })

def check_task_completion_eligibility(task):
    """
    Rule 5: A task cannot be marked completed if any prerequisite remains incomplete.
    """
    incomplete_prereqs = task.upstream_dependencies.exclude(
        prerequisite_task__status=Task.STATUS_COMPLETED
    ).select_related('prerequisite_task')

    if incomplete_prereqs.exists():
        prereq_details = [
            f"'{dep.prerequisite_task.title}' (ID: {dep.prerequisite_task.id}, Status: {dep.prerequisite_task.status})"
            for dep in incomplete_prereqs
        ]
        raise ValidationError({
            "status": [
                f"Cannot mark task '{task.title}' (ID: {task.id}) as completed. The following prerequisite task(s) are incomplete: {', '.join(prereq_details)}."
            ]
        })

def get_blocked_task_ids_for_project(project_id):
    """
    Calculates blocked task IDs for a project.
    A task is blocked if it is not completed and at least one prerequisite is not completed.
    """
    # Find all dependent tasks where prerequisite is NOT completed
    blocked_ids = TaskDependency.objects.filter(
        prerequisite_task__project_id=project_id
    ).exclude(
        prerequisite_task__status=Task.STATUS_COMPLETED
    ).values_list('dependent_task_id', flat=True).distinct()

    # Further filter out tasks that are already completed
    return set(
        Task.objects.filter(
            id__in=blocked_ids,
            project_id=project_id
        ).exclude(
            status=Task.STATUS_COMPLETED
        ).values_list('id', flat=True)
    )

def is_task_blocked(task):
    """
    Determines if an individual task is blocked.
    """
    if task.status == Task.STATUS_COMPLETED:
        return False
    return task.upstream_dependencies.exclude(
        prerequisite_task__status=Task.STATUS_COMPLETED
    ).exists()
