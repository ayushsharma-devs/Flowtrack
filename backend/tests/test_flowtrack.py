from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from projects.models import Project
from tasks.models import Task
from dependencies.models import TaskDependency
from activity.models import ActivityLog
from dependencies.services import get_blocked_task_ids_for_project, is_task_blocked
from analytics.services import calculate_project_analytics

class FlowTrackBackendTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        # User 1
        self.user1 = User.objects.create_user(
            username='alice',
            email='alice@example.com',
            password='Password123!'
        )

        # User 2 (for data isolation testing)
        self.user2 = User.objects.create_user(
            username='bob',
            email='bob@example.com',
            password='Password123!'
        )

        # Authenticate as user 1 by default
        self.client.force_authenticate(user=self.user1)

    # 1. User Registration & Authentication
    def test_user_registration(self):
        anon_client = APIClient()
        response = anon_client.post('/api/auth/register/', {
            'username': 'charlie',
            'email': 'charlie@example.com',
            'password': 'Password123!',
            'password_confirm': 'Password123!',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='charlie').exists())
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])

    def test_user_registration_duplicate_username(self):
        anon_client = APIClient()
        response = anon_client.post('/api/auth/register/', {
            'username': 'alice',
            'email': 'alice2@example.com',
            'password': 'Password123!',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_jwt(self):
        anon_client = APIClient()
        response = anon_client.post('/api/auth/token/', {
            'username': 'alice',
            'password': 'Password123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    # 2. Project CRUD
    def test_project_crud(self):
        # Create
        create_res = self.client.post('/api/projects/', {
            'title': 'Website Redesign',
            'description': 'Revamp corporate site',
            'deadline': (timezone.now() + timedelta(days=30)).isoformat(),
        })
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        project_id = create_res.data['id']
        self.assertEqual(create_res.data['title'], 'Website Redesign')

        # Read list
        list_res = self.client.get('/api/projects/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 1)

        # Read detail
        detail_res = self.client.get(f'/api/projects/{project_id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['description'], 'Revamp corporate site')

        # Update (PATCH)
        patch_res = self.client.patch(f'/api/projects/{project_id}/', {
            'title': 'Website 2.0 Redesign',
        })
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['title'], 'Website 2.0 Redesign')

        # Delete
        del_res = self.client.delete(f'/api/projects/{project_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Project.objects.filter(id=project_id).exists())

    # 3. User Data Isolation
    def test_user_data_isolation(self):
        proj_user1 = Project.objects.create(owner=self.user1, title="Alice's Secret Project")
        proj_user2 = Project.objects.create(owner=self.user2, title="Bob's Secret Project")

        # Alice should only see her own project
        res_alice = self.client.get('/api/projects/')
        self.assertEqual(res_alice.status_code, status.HTTP_200_OK)
        project_ids = [p['id'] for p in res_alice.data]
        self.assertIn(proj_user1.id, project_ids)
        self.assertNotIn(proj_user2.id, project_ids)

        # Alice trying to retrieve Bob's project directly gets 404
        direct_res = self.client.get(f'/api/projects/{proj_user2.id}/')
        self.assertEqual(direct_res.status_code, status.HTTP_404_NOT_FOUND)

    # 4. Task CRUD & Filtering
    def test_task_crud_and_filtering(self):
        project = Project.objects.create(owner=self.user1, title="Alpha")

        # Create Task
        t1_res = self.client.post(f'/api/projects/{project.id}/tasks/', {
            'title': 'Design Mockups',
            'description': 'Figma wireframes',
            'priority': 'high',
            'status': 'todo',
            'due_date': (timezone.now() + timedelta(days=2)).isoformat(),
        })
        self.assertEqual(t1_res.status_code, status.HTTP_201_CREATED)
        task1_id = t1_res.data['id']

        t2_res = self.client.post(f'/api/projects/{project.id}/tasks/', {
            'title': 'Build Components',
            'priority': 'low',
            'status': 'in_progress',
        })
        self.assertEqual(t2_res.status_code, status.HTTP_201_CREATED)

        # Filter by priority
        filter_res = self.client.get(f'/api/projects/{project.id}/tasks/?priority=high')
        self.assertEqual(filter_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_res.data), 1)
        self.assertEqual(filter_res.data[0]['id'], task1_id)

        # Update Task
        update_res = self.client.patch(f'/api/tasks/{task1_id}/', {
            'status': 'in_progress',
            'priority': 'medium',
        })
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data['status'], 'in_progress')
        self.assertEqual(update_res.data['priority'], 'medium')

        # Delete Task
        del_task = self.client.delete(f'/api/tasks/{task1_id}/')
        self.assertEqual(del_task.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task1_id).exists())

    # 5. Dependency Validation: Self-dependency
    def test_self_dependency_rejection(self):
        project = Project.objects.create(owner=self.user1, title="Project 1")
        task = Task.objects.create(project=project, title="Task A")

        res = self.client.post('/api/dependencies/', {
            'prerequisite_task': task.id,
            'dependent_task': task.id,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot depend on itself', str(res.data))

    # 6. Dependency Validation: Cross-project dependency
    def test_cross_project_dependency_rejection(self):
        project1 = Project.objects.create(owner=self.user1, title="Project 1")
        project2 = Project.objects.create(owner=self.user1, title="Project 2")
        task1 = Task.objects.create(project=project1, title="Task A")
        task2 = Task.objects.create(project=project2, title="Task B")

        res = self.client.post('/api/dependencies/', {
            'prerequisite_task': task1.id,
            'dependent_task': task2.id,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cross-project', str(res.data))

    # 7. Dependency Validation: Duplicate dependency
    def test_duplicate_dependency_rejection(self):
        project = Project.objects.create(owner=self.user1, title="Project 1")
        task1 = Task.objects.create(project=project, title="Task A")
        task2 = Task.objects.create(project=project, title="Task B")

        res1 = self.client.post('/api/dependencies/', {
            'prerequisite_task': task1.id,
            'dependent_task': task2.id,
        })
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post('/api/dependencies/', {
            'prerequisite_task': task1.id,
            'dependent_task': task2.id,
        })
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', str(res2.data))

    # 8. Dependency Validation: Cycle detection using DFS
    def test_circular_dependency_rejection_direct_cycle(self):
        # A -> B -> A
        project = Project.objects.create(owner=self.user1, title="Project 1")
        t_a = Task.objects.create(project=project, title="Task A")
        t_b = Task.objects.create(project=project, title="Task B")

        # Edge A -> B (B depends on A)
        res_ab = self.client.post('/api/dependencies/', {
            'prerequisite_task': t_a.id,
            'dependent_task': t_b.id,
        })
        self.assertEqual(res_ab.status_code, status.HTTP_201_CREATED)

        # Attempt Edge B -> A (A depends on B) => Cycle A -> B -> A
        res_ba = self.client.post('/api/dependencies/', {
            'prerequisite_task': t_b.id,
            'dependent_task': t_a.id,
        })
        self.assertEqual(res_ba.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Circular dependency', str(res_ba.data))

    def test_circular_dependency_rejection_transitive_cycle(self):
        # A -> B -> C -> A
        project = Project.objects.create(owner=self.user1, title="Project 1")
        t_a = Task.objects.create(project=project, title="Task A")
        t_b = Task.objects.create(project=project, title="Task B")
        t_c = Task.objects.create(project=project, title="Task C")

        # A -> B
        self.client.post('/api/dependencies/', {'prerequisite_task': t_a.id, 'dependent_task': t_b.id})
        # B -> C
        self.client.post('/api/dependencies/', {'prerequisite_task': t_b.id, 'dependent_task': t_c.id})

        # C -> A should be rejected
        res_ca = self.client.post('/api/dependencies/', {
            'prerequisite_task': t_c.id,
            'dependent_task': t_a.id,
        })
        self.assertEqual(res_ca.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Circular dependency', str(res_ca.data))

    # 9. Completion restriction when prerequisites are incomplete
    def test_completion_restricted_if_prerequisites_incomplete(self):
        project = Project.objects.create(owner=self.user1, title="Project 1")
        t_prereq = Task.objects.create(project=project, title="Prerequisite", status='todo')
        t_dep = Task.objects.create(project=project, title="Dependent", status='todo')

        # Link dep depends on prereq
        TaskDependency.objects.create(prerequisite_task=t_prereq, dependent_task=t_dep)

        # Attempt to mark t_dep as completed while t_prereq is 'todo'
        res = self.client.patch(f'/api/tasks/{t_dep.id}/', {'status': 'completed'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('incomplete', str(res.data))

        # Now complete prerequisite
        t_prereq.status = 'completed'
        t_prereq.save()

        # Now completing t_dep succeeds
        res_success = self.client.patch(f'/api/tasks/{t_dep.id}/', {'status': 'completed'})
        self.assertEqual(res_success.status_code, status.HTTP_200_OK)
        self.assertEqual(res_success.data['status'], 'completed')
        self.assertIsNotNone(res_success.data['completed_at'])

    # 10. Automatic Blocked / Unblocked State Calculation
    def test_blocked_task_calculation(self):
        project = Project.objects.create(owner=self.user1, title="Project 1")
        t_prereq = Task.objects.create(project=project, title="Prereq", status='todo')
        t_dep = Task.objects.create(project=project, title="Dependent", status='todo')
        TaskDependency.objects.create(prerequisite_task=t_prereq, dependent_task=t_dep)

        # t_dep is blocked because t_prereq is incomplete
        self.assertTrue(is_task_blocked(t_dep))
        blocked_ids = get_blocked_task_ids_for_project(project.id)
        self.assertIn(t_dep.id, blocked_ids)
        self.assertNotIn(t_prereq.id, blocked_ids)

        # Check API response for t_dep reflects is_blocked=True
        detail_res = self.client.get(f'/api/tasks/{t_dep.id}/')
        self.assertTrue(detail_res.data['is_blocked'])

        # Complete t_prereq -> t_dep dynamically unblocks
        t_prereq.status = 'completed'
        t_prereq.save()

        self.assertFalse(is_task_blocked(t_dep))
        blocked_ids_after = get_blocked_task_ids_for_project(project.id)
        self.assertNotIn(t_dep.id, blocked_ids_after)

        detail_res2 = self.client.get(f'/api/tasks/{t_dep.id}/')
        self.assertFalse(detail_res2.data['is_blocked'])

    # 11. Analytics & Bottleneck Calculations
    def test_analytics_and_bottleneck_calculations(self):
        project = Project.objects.create(owner=self.user1, title="Analytics Project")
        past_time = timezone.now() - timedelta(days=2)

        # t1 is overdue and has 2 downstream tasks
        t1 = Task.objects.create(project=project, title="T1", status='todo', due_date=past_time)
        t2 = Task.objects.create(project=project, title="T2", status='todo')
        t3 = Task.objects.create(project=project, title="T3", status='completed')

        TaskDependency.objects.create(prerequisite_task=t1, dependent_task=t2)
        TaskDependency.objects.create(prerequisite_task=t1, dependent_task=t3)

        analytics = calculate_project_analytics(project)
        self.assertEqual(analytics['total_tasks'], 3)
        self.assertEqual(analytics['completed_tasks'], 1)
        self.assertEqual(analytics['todo_tasks'], 2)
        self.assertEqual(analytics['overdue_tasks'], 1)
        # Progress: (1 / 3) * 100 = 33.3%
        self.assertEqual(analytics['progress_percentage'], 33.3)

        # Bottleneck score for t1: downstream count (2) + 2 * overdue (1) = 4
        t1_bottleneck = next(b for b in analytics['bottlenecks'] if b['task_id'] == t1.id)
        self.assertEqual(t1_bottleneck['downstream_task_count'], 2)
        self.assertEqual(t1_bottleneck['overdue_flag'], 1)
        self.assertEqual(t1_bottleneck['bottleneck_score'], 4)

        # Check API endpoint
        res = self.client.get(f'/api/projects/{project.id}/analytics/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['progress_percentage'], 33.3)
        self.assertIn('bottlenecks', res.data)

    # 12. Cascading Deletion
    def test_cascading_deletion(self):
        project = Project.objects.create(owner=self.user1, title="Cascade Project")
        t1 = Task.objects.create(project=project, title="Task 1")
        t2 = Task.objects.create(project=project, title="Task 2")
        dep = TaskDependency.objects.create(prerequisite_task=t1, dependent_task=t2)
        act = ActivityLog.objects.create(
            project=project,
            user=self.user1,
            action='project_created',
            description='Test',
            entity_type='project',
            entity_id=project.id
        )

        # Deleting project cascades to tasks, dependencies, and activity logs
        project.delete()
        self.assertFalse(Task.objects.filter(id__in=[t1.id, t2.id]).exists())
        self.assertFalse(TaskDependency.objects.filter(id=dep.id).exists())
        self.assertFalse(ActivityLog.objects.filter(id=act.id).exists())

    # 13. Graph Visualization Endpoint
    def test_graph_visualization_endpoint(self):
        project = Project.objects.create(owner=self.user1, title="Graph Project")
        t1 = Task.objects.create(project=project, title="Node 1", status='completed')
        t2 = Task.objects.create(project=project, title="Node 2", status='in_progress')
        dep = TaskDependency.objects.create(prerequisite_task=t1, dependent_task=t2)

        res = self.client.get(f'/api/projects/{project.id}/graph/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['nodes']), 2)
        self.assertEqual(len(res.data['edges']), 1)
        self.assertEqual(res.data['edges'][0]['source'], str(t1.id))
        self.assertEqual(res.data['edges'][0]['target'], str(t2.id))

    # 14. Activity Logging Endpoints
    def test_activity_logging_endpoints(self):
        project = Project.objects.create(owner=self.user1, title="Activity Project")
        # Trigger an action: create a task via API
        self.client.post(f'/api/projects/{project.id}/tasks/', {'title': 'Task with Log'})

        # Check project activity endpoint
        res = self.client.get(f'/api/projects/{project.id}/activity/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) > 0)
        self.assertEqual(res.data[0]['action'], 'task_created')

        # Check global recent activity endpoint
        res_global = self.client.get('/api/activity/')
        self.assertEqual(res_global.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res_global.data) > 0)

