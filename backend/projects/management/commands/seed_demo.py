from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone

from projects.models import Project
from tasks.models import Task
from dependencies.models import TaskDependency
from activity.services import log_activity

class Command(BaseCommand):
    help = 'Seeds initial demonstration data for FlowTrack'

    def handle(self, *args, **options):
        self.stdout.write("Seeding FlowTrack demo data...")

        # 1. Create Demo User
        user, created = User.objects.get_or_create(username='demo', defaults={
            'email': 'demo@flowtrack.dev',
            'first_name': 'Alex',
            'last_name': 'Morgan'
        })
        user.set_password('password123')
        user.save()

        # 2. Project 1: Cloud Platform Migration
        now = timezone.now()
        proj1, _ = Project.objects.get_or_create(
            owner=user,
            title='Cloud Infrastructure Migration',
            defaults={
                'description': 'Migrate monolithic services into cloud containerized microservices and automated CI/CD pipeline.',
                'deadline': now + timedelta(days=25)
            }
        )

        # Clear existing demo tasks for idempotency
        proj1.tasks.all().delete()

        t1 = Task.objects.create(
            project=proj1,
            title='Define Architecture & Terraform Specs',
            description='Design VPC, subnets, IAM roles, and Terraform modules for multi-region cloud deployment.',
            status='completed',
            priority='high',
            due_date=now - timedelta(days=10)
        )
        t2 = Task.objects.create(
            project=proj1,
            title='Database Schema & Migration Scripts',
            description='Draft Postgres schemas, foreign keys, partition strategy, and backward-compatible Alembic migrations.',
            status='completed',
            priority='high',
            due_date=now - timedelta(days=5)
        )
        t3 = Task.objects.create(
            project=proj1,
            title='Containerize Core Microservices',
            description='Build Dockerfiles, multi-stage builds, distroless images, and optimize caching layers.',
            status='in_progress',
            priority='high',
            due_date=now - timedelta(days=2)  # Overdue to illustrate bottleneck scoring!
        )
        t4 = Task.objects.create(
            project=proj1,
            title='Configure Kubernetes Helm Charts',
            description='Write Helm templates for deployments, ingress, config maps, and horizontal pod autoscalers.',
            status='todo',
            priority='medium',
            due_date=now + timedelta(days=5)
        )
        t5 = Task.objects.create(
            project=proj1,
            title='Deploy Staging Cluster & Ingress',
            description='Provision cluster in staging environment and configure TLS certificates via Cert-Manager.',
            status='todo',
            priority='high',
            due_date=now + timedelta(days=10)
        )
        t6 = Task.objects.create(
            project=proj1,
            title='End-to-End Integration & Load Testing',
            description='Simulate traffic with k6, verify rate limits, database connection pooling, and circuit breakers.',
            status='todo',
            priority='medium',
            due_date=now + timedelta(days=18)
        )
        t7 = Task.objects.create(
            project=proj1,
            title='Production Cutover & DNS Switch',
            description='Execute scheduled blue-green maintenance window and switch Cloudflare DNS records.',
            status='todo',
            priority='high',
            due_date=now + timedelta(days=24)
        )

        # Dependencies:
        # t1 -> t3 (Containerize depends on Terraform/Arch)
        # t2 -> t3 (Containerize depends on Database Schema)
        # t3 -> t4 (Helm charts depend on Containerize)
        # t4 -> t5 (Deploy staging depends on Helm charts)
        # t5 -> t6 (Testing depends on Staging deployment)
        # t6 -> t7 (Cutover depends on Testing)
        TaskDependency.objects.create(prerequisite_task=t1, dependent_task=t3)
        TaskDependency.objects.create(prerequisite_task=t2, dependent_task=t3)
        TaskDependency.objects.create(prerequisite_task=t3, dependent_task=t4)
        TaskDependency.objects.create(prerequisite_task=t4, dependent_task=t5)
        TaskDependency.objects.create(prerequisite_task=t5, dependent_task=t6)
        TaskDependency.objects.create(prerequisite_task=t6, dependent_task=t7)

        # Project 2: Mobile App MVP
        proj2, _ = Project.objects.get_or_create(
            owner=user,
            title='Mobile App v1.0 MVP',
            defaults={
                'description': 'React Native customer-facing mobile application for iOS and Android.',
                'deadline': now + timedelta(days=40)
            }
        )
        proj2.tasks.all().delete()
        m1 = Task.objects.create(project=proj2, title='UX Wireframes & Component Specs', status='completed', priority='medium')
        m2 = Task.objects.create(project=proj2, title='Setup React Native & Navigation', status='in_progress', priority='high')
        m3 = Task.objects.create(project=proj2, title='OAuth & Biometric Authentication', status='todo', priority='high')
        m4 = Task.objects.create(project=proj2, title='App Store & Google Play Submission', status='todo', priority='medium')

        TaskDependency.objects.create(prerequisite_task=m1, dependent_task=m2)
        TaskDependency.objects.create(prerequisite_task=m2, dependent_task=m3)
        TaskDependency.objects.create(prerequisite_task=m3, dependent_task=m4)

        # Log sample activities
        log_activity(proj1, user, 'project_created', f"Project '{proj1.title}' initialized.", 'project', proj1.id)
        log_activity(proj1, user, 'task_completed', f"Task '{t1.title}' marked as completed.", 'task', t1.id)
        log_activity(proj1, user, 'task_completed', f"Task '{t2.title}' marked as completed.", 'task', t2.id)
        log_activity(proj1, user, 'dependency_added', f"Dependency linked: '{t3.title}' depends on '{t1.title}'", 'dependency', 1)

        self.stdout.write(self.style.SUCCESS("Demo data successfully created! User: 'demo', Password: 'password123'"))
