from django.utils import timezone
from tasks.models import Task
from dependencies.models import TaskDependency
from dependencies.services import get_blocked_task_ids_for_project

def calculate_project_analytics(project):
    """
    Computes comprehensive analytics and bottleneck detection for a project.
    """
    now = timezone.now()
    tasks = list(project.tasks.all())
    total_tasks = len(tasks)

    completed_tasks = sum(1 for t in tasks if t.status == Task.STATUS_COMPLETED)
    in_progress_tasks = sum(1 for t in tasks if t.status == Task.STATUS_IN_PROGRESS)
    todo_tasks = sum(1 for t in tasks if t.status == Task.STATUS_TODO)

    blocked_task_ids = get_blocked_task_ids_for_project(project.id)
    blocked_tasks_count = len(blocked_task_ids)

    overdue_tasks_count = sum(1 for t in tasks if t.status != Task.STATUS_COMPLETED and t.due_date and t.due_date < now)

    progress_percentage = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    # Status distribution
    status_distribution = [
        {"name": "To Do", "status": "todo", "count": todo_tasks},
        {"name": "In Progress", "status": "in_progress", "count": in_progress_tasks},
        {"name": "Completed", "status": "completed", "count": completed_tasks},
    ]

    # Priority distribution
    priority_counts = {
        "high": sum(1 for t in tasks if t.priority == Task.PRIORITY_HIGH),
        "medium": sum(1 for t in tasks if t.priority == Task.PRIORITY_MEDIUM),
        "low": sum(1 for t in tasks if t.priority == Task.PRIORITY_LOW),
    }
    priority_distribution = [
        {"name": "High Priority", "priority": "high", "count": priority_counts["high"]},
        {"name": "Medium Priority", "priority": "medium", "count": priority_counts["medium"]},
        {"name": "Low Priority", "priority": "low", "count": priority_counts["low"]},
    ]

    # Bottleneck detection
    # Downstream task count for each task
    # Bottleneck Score = Downstream Task Count + 2 × Overdue Flag
    downstream_counts = {}
    for dep in TaskDependency.objects.filter(prerequisite_task__project_id=project.id):
        downstream_counts[dep.prerequisite_task_id] = downstream_counts.get(dep.prerequisite_task_id, 0) + 1

    bottlenecks = []
    for t in tasks:
        downstream_count = downstream_counts.get(t.id, 0)
        is_overdue = bool(t.status != Task.STATUS_COMPLETED and t.due_date and t.due_date < now)
        overdue_flag = 1 if is_overdue else 0
        bottleneck_score = downstream_count + (2 * overdue_flag)

        bottlenecks.append({
            "task_id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "is_blocked": t.id in blocked_task_ids,
            "is_overdue": is_overdue,
            "downstream_task_count": downstream_count,
            "overdue_flag": overdue_flag,
            "bottleneck_score": bottleneck_score,
        })

    # Sort bottlenecks descending by bottleneck_score, then downstream_task_count
    bottlenecks.sort(key=lambda x: (x["bottleneck_score"], x["downstream_task_count"]), reverse=True)

    return {
        "project_id": project.id,
        "project_title": project.title,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "todo_tasks": todo_tasks,
        "blocked_tasks": blocked_tasks_count,
        "overdue_tasks": overdue_tasks_count,
        "progress_percentage": progress_percentage,
        "status_distribution": status_distribution,
        "priority_distribution": priority_distribution,
        "bottlenecks": bottlenecks,
        "heuristic_note": "Bottleneck score = Downstream Task Count + 2 × Overdue Flag. This dependency-impact heuristic highlights workflow bottlenecks, and is distinguished from formal Critical Path Method (CPM) duration scheduling."
    }

def calculate_user_overview_analytics(user):
    """
    Computes aggregated overview analytics across all projects owned by the user.
    """
    now = timezone.now()
    projects = list(user.projects.all())
    total_projects = len(projects)

    all_tasks = list(Task.objects.filter(project__owner=user))
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.status == Task.STATUS_COMPLETED)
    in_progress_tasks = sum(1 for t in all_tasks if t.status == Task.STATUS_IN_PROGRESS)
    todo_tasks = sum(1 for t in all_tasks if t.status == Task.STATUS_TODO)
    overdue_tasks = sum(1 for t in all_tasks if t.status != Task.STATUS_COMPLETED and t.due_date and t.due_date < now)

    # Blocked tasks across all projects
    total_blocked = 0
    for p in projects:
        total_blocked += len(get_blocked_task_ids_for_project(p.id))

    overall_progress = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    return {
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "todo_tasks": todo_tasks,
        "blocked_tasks": total_blocked,
        "overdue_tasks": overdue_tasks,
        "progress_percentage": overall_progress,
        "status_distribution": [
            {"name": "To Do", "status": "todo", "count": todo_tasks},
            {"name": "In Progress", "status": "in_progress", "count": in_progress_tasks},
            {"name": "Completed", "status": "completed", "count": completed_tasks},
        ],
        "priority_distribution": [
            {"name": "High Priority", "priority": "high", "count": sum(1 for t in all_tasks if t.priority == Task.PRIORITY_HIGH)},
            {"name": "Medium Priority", "priority": "medium", "count": sum(1 for t in all_tasks if t.priority == Task.PRIORITY_MEDIUM)},
            {"name": "Low Priority", "priority": "low", "count": sum(1 for t in all_tasks if t.priority == Task.PRIORITY_LOW)},
        ]
    }
