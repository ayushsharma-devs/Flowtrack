# FlowTrack — REST API Documentation

Base URL: `http://localhost:8000`

All endpoints (except `/api/auth/register/` and `/api/auth/token/`) require authentication via JWT:
```http
Authorization: Bearer <access_token>
```

---

## 1. Authentication Endpoints

### 1.1 Register User
- **Method**: `POST`
- **URL**: `/api/auth/register/`
- **Request Body**:
  ```json
  {
    "username": "developer",
    "email": "dev@example.com",
    "password": "Password123!",
    "password_confirm": "Password123!"
  }
  ```
- **Success Response** (`201 Created`):
  ```json
  {
    "message": "User registered successfully.",
    "user": {
      "id": 1,
      "username": "developer",
      "email": "dev@example.com",
      "date_joined": "2026-11-20T08:30:00Z"
    },
    "tokens": {
      "access": "eyJhbGciOi...",
      "refresh": "eyJhbGciOi..."
    }
  }
  ```

### 1.2 Obtain JWT Tokens (Login)
- **Method**: `POST`
- **URL**: `/api/auth/token/`
- **Request Body**:
  ```json
  {
    "username": "developer",
    "password": "Password123!"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
  ```

### 1.3 Refresh JWT Token
- **Method**: `POST`
- **URL**: `/api/auth/token/refresh/`
- **Request Body**:
  ```json
  {
    "refresh": "eyJhbGciOi..."
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
  ```

### 1.4 Get Current User Profile
- **Method**: `GET`
- **URL**: `/api/auth/me/`
- **Success Response** (`200 OK`):
  ```json
  {
    "id": 1,
    "username": "developer",
    "email": "dev@example.com",
    "date_joined": "2026-11-20T08:30:00Z"
  }
  ```

---

## 2. Project Endpoints

### 2.1 List Projects
- **Method**: `GET`
- **URL**: `/api/projects/`
- **Success Response** (`200 OK`):
  ```json
  [
    {
      "id": 1,
      "owner": 1,
      "owner_username": "developer",
      "title": "Cloud Infrastructure Migration",
      "description": "Migrate monolithic services into cloud microservices.",
      "deadline": "2026-12-15T00:00:00Z",
      "completion_percentage": 28.6,
      "total_tasks": 7,
      "completed_tasks": 2,
      "in_progress_tasks": 1,
      "todo_tasks": 4,
      "blocked_tasks": 3,
      "overdue_tasks": 1,
      "created_at": "2026-11-20T08:30:00Z",
      "updated_at": "2026-11-20T08:45:00Z"
    }
  ]
  ```

### 2.2 Create Project
- **Method**: `POST`
- **URL**: `/api/projects/`
- **Request Body**:
  ```json
  {
    "title": "Mobile App MVP",
    "description": "React Native customer mobile application.",
    "deadline": "2026-12-30T18:00:00Z"
  }
  ```
- **Success Response** (`201 Created`): Returns created project object.

### 2.3 Get Project Details
- **Method**: `GET`
- **URL**: `/api/projects/{id}/`
- **Success Response** (`200 OK`): Returns project object with calculated task stats.

### 2.4 Update Project
- **Method**: `PATCH`
- **URL**: `/api/projects/{id}/`
- **Request Body**: Partial update fields (`title`, `description`, `deadline`).
- **Success Response** (`200 OK`): Returns updated project object.

### 2.5 Delete Project
- **Method**: `DELETE`
- **URL**: `/api/projects/{id}/`
- **Success Response** (`204 No Content`): Project and all cascading tasks, dependencies, and activities deleted.

---

## 3. Task Endpoints

### 3.1 List Tasks in Project
- **Method**: `GET`
- **URL**: `/api/projects/{project_id}/tasks/`
- **Query Parameters**:
  - `status`: Filter by `todo`, `in_progress`, `completed`, `blocked`, `overdue`.
  - `priority`: Filter by `low`, `medium`, `high`.
  - `sort_by`: `due_date`, `-due_date`, `created_at`, `-created_at`, `priority`.
  - `search`: Keyword search in title/description.
- **Success Response** (`200 OK`):
  ```json
  [
    {
      "id": 10,
      "project": 1,
      "project_title": "Cloud Infrastructure Migration",
      "title": "Configure Kubernetes Helm Charts",
      "description": "Write Helm templates for deployments.",
      "status": "todo",
      "priority": "medium",
      "due_date": "2026-11-25T18:00:00Z",
      "is_blocked": true,
      "is_overdue": false,
      "bottleneck_score": 3,
      "prerequisites": [
        { "id": 9, "title": "Containerize Core Microservices", "status": "in_progress", "priority": "high" }
      ],
      "dependents": [
        { "id": 11, "title": "Deploy Staging Cluster", "status": "todo", "priority": "high" }
      ],
      "created_at": "2026-11-20T08:35:00Z",
      "updated_at": "2026-11-20T08:35:00Z",
      "completed_at": null
    }
  ]
  ```

### 3.2 Create Task
- **Method**: `POST`
- **URL**: `/api/projects/{project_id}/tasks/`
- **Request Body**:
  ```json
  {
    "title": "Implement OAuth2 Flow",
    "description": "Add Google and GitHub OAuth providers.",
    "status": "todo",
    "priority": "high",
    "due_date": "2026-11-28T12:00:00Z"
  }
  ```
- **Success Response** (`201 Created`): Returns created task object.

### 3.3 Update Task
- **Method**: `PATCH`
- **URL**: `/api/tasks/{id}/`
- **Request Body**:
  ```json
  {
    "status": "completed"
  }
  ```
- **Success Response** (`200 OK`): Returns updated task object.
- **Error Response** (`400 Bad Request` - Prerequisite Incomplete):
  ```json
  {
    "status": [
      "Cannot mark task 'Deploy Staging Cluster' (ID: 11) as completed. The following prerequisite task(s) are incomplete: 'Configure Kubernetes Helm Charts' (ID: 10, Status: todo)."
    ]
  }
  ```

### 3.4 Delete Task
- **Method**: `DELETE`
- **URL**: `/api/tasks/{id}/`
- **Success Response** (`204 No Content`): Task and associated dependencies removed.

---

## 4. Task Dependency Endpoints

### 4.1 Create Dependency Edge
- **Method**: `POST`
- **URL**: `/api/dependencies/`
- **Request Body**:
  ```json
  {
    "prerequisite_task": 1,
    "dependent_task": 2
  }
  ```
- **Success Response** (`201 Created`):
  ```json
  {
    "id": 5,
    "prerequisite_task": 1,
    "prerequisite_title": "Database Schema Setup",
    "dependent_task": 2,
    "dependent_title": "Build REST APIs",
    "created_at": "2026-11-20T08:40:00Z"
  }
  ```
- **Error Responses** (`400 Bad Request`):
  - **Self-dependency**:
    ```json
    { "non_field_errors": ["A task cannot depend on itself."] }
    ```
  - **Cross-project dependency**:
    ```json
    { "non_field_errors": ["Cross-project dependencies are prohibited..."] }
    ```
  - **Circular Dependency Cycle Detected**:
    ```json
    {
      "non_field_errors": [
        "Circular dependency detected! A path already exists from dependent Task 2 to prerequisite Task 1. Adding this dependency would create a cycle: [2 -> 3 -> 1 -> 2]."
      ]
    }
    ```

### 4.2 Delete Dependency Edge
- **Method**: `DELETE`
- **URL**: `/api/dependencies/{id}/`
- **Success Response** (`204 No Content`)

---

## 5. Visualization Endpoint

### 5.1 Get React Flow Graph Data
- **Method**: `GET`
- **URL**: `/api/projects/{project_id}/graph/`
- **Success Response** (`200 OK`):
  ```json
  {
    "project_id": 1,
    "project_title": "Cloud Infrastructure Migration",
    "nodes": [
      {
        "id": "1",
        "type": "customTaskNode",
        "position": { "x": 0, "y": 0 },
        "data": {
          "id": 1,
          "title": "Define Architecture",
          "description": "Terraform specs",
          "status": "completed",
          "priority": "high",
          "due_date": "2026-11-10T00:00:00Z",
          "is_blocked": false,
          "is_overdue": false,
          "bottleneck_score": 2,
          "prerequisite_count": 0,
          "dependent_count": 1
        }
      }
    ],
    "edges": [
      {
        "id": "e-1-3",
        "source": "1",
        "target": "3",
        "dependency_id": 4,
        "animated": true
      }
    ]
  }
  ```

---

## 6. Analytics Endpoints

### 6.1 Project Analytics & Bottlenecks
- **Method**: `GET`
- **URL**: `/api/projects/{project_id}/analytics/`
- **Success Response** (`200 OK`):
  ```json
  {
    "project_id": 1,
    "project_title": "Cloud Infrastructure Migration",
    "total_tasks": 7,
    "completed_tasks": 2,
    "in_progress_tasks": 1,
    "todo_tasks": 4,
    "blocked_tasks": 4,
    "overdue_tasks": 1,
    "progress_percentage": 28.6,
    "status_distribution": [
      { "name": "To Do", "status": "todo", "count": 4 },
      { "name": "In Progress", "status": "in_progress", "count": 1 },
      { "name": "Completed", "status": "completed", "count": 2 }
    ],
    "priority_distribution": [
      { "name": "High Priority", "priority": "high", "count": 5 },
      { "name": "Medium Priority", "priority": "medium", "count": 2 },
      { "name": "Low Priority", "priority": "low", "count": 0 }
    ],
    "bottlenecks": [
      {
        "task_id": 3,
        "title": "Containerize Core Microservices",
        "status": "in_progress",
        "priority": "high",
        "due_date": "2026-11-18T00:00:00Z",
        "is_blocked": false,
        "is_overdue": true,
        "downstream_task_count": 1,
        "overdue_flag": 1,
        "bottleneck_score": 3
      }
    ],
    "heuristic_note": "Bottleneck score = Downstream Task Count + 2 × Overdue Flag..."
  }
  ```

### 6.2 Overall System Analytics
- **Method**: `GET`
- **URL**: `/api/analytics/overview/`
- **Success Response** (`200 OK`): Aggregated statistics across all projects owned by the user.

---

## 7. Audit Activity Endpoints

### 7.1 Recent User Activity
- **Method**: `GET`
- **URL**: `/api/activity/`
- **Success Response** (`200 OK`): Returns up to 50 most recent activity records across all projects.

### 7.2 Project-Specific Activity
- **Method**: `GET`
- **URL**: `/api/projects/{project_id}/activity/`
- **Success Response** (`200 OK`): Returns chronological audit events for that specific project.
