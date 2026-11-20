# FlowTrack — Full-Stack Workflow & Task Dependency Manager

FlowTrack is a personal workflow and project management platform inspired by modern engineering tools like Linear. It models and schedules tasks as **Directed Acyclic Graphs (DAGs)**, providing interactive graph visualization, automated DFS cycle detection, dynamic blocked task computation, and dependency-based bottleneck analytics.

---

## Key Features

- **Project Workspaces**: Isolated single-user workspaces with completion velocity tracking and cascade lifecycle rules.
- **Task Management**: Full CRUD capabilities, priority rankings (`low`, `medium`, `high`), status lifecycles (`todo`, `in_progress`, `completed`), and deadline tracking.
- **Directed Graph Dependency Engine**:
  - Connect tasks as directed edges \(A \to B\) (task \(B\) depends on prerequisite \(A\)).
  - **DFS Cycle Detection**: Rejects circular dependency paths in real-time on the backend before insertion.
  - **Completion Restriction (Rule 5)**: Tasks cannot transition to `completed` if any prerequisite remains incomplete.
  - **Dynamic Blocked Status**: Blocked states are evaluated on-the-fly from upstream dependencies.
  - **Cascade Cleanup**: Deleting tasks automatically cleans up incoming and outgoing dependency edges.
- **Interactive Graph Visualization**:
  - Rendered via **React Flow (`@xyflow/react`)**.
  - Automatic hierarchical layout powered by **Dagre (`@dagrejs/dagre`)**.
  - Interactive drag-to-connect dependency creation and click-to-delete edge inspection.
  - Node selection drawer with prerequisite and dependent task inspector.
- **Analytics & Bottleneck Detection**:
  - Real-time **Recharts** charts for status breakdown and priority distributions.
  - **Bottleneck Scoring Heuristic**:
    \[
    \text{Bottleneck Score} = \text{Downstream Task Count} + 2 \times \text{Overdue Flag}
    \]
  - Transparently highlights blockage risks with clear distinction from formal Critical Path Method (CPM) scheduling.
- **Audit Activity Feed**: Chronological event logs for project creation, task updates, completions, and dependency linkages.

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Linear-inspired dark theme)
- **Graph Canvas**: React Flow (`@xyflow/react`)
- **Graph Layout**: Dagre (`@dagrejs/dagre`)
- **Analytics Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Framework**: Django 5 & Django REST Framework (DRF)
- **Authentication**: DRF Simple JWT (Access & Refresh tokens)
- **Database**: PostgreSQL (with zero-config SQLite development fallback)
- **Test Suite**: Django Test Runner & Pytest

---

## Project Structure

```
flowtrack/
  backend/
    config/             # Django settings, root URLs, WSGI/ASGI
    accounts/           # User authentication, registration, JWT profile
    projects/           # Projects models, serializers, views, seed commands
    tasks/              # Task models, serializers, filters, validation
    dependencies/       # TaskDependency models, DFS cycle detection, graph API
    analytics/          # Analytics computation, bottleneck scoring engine
    activity/           # Audit activity logging models and views
    tests/              # Comprehensive automated backend test suite
    manage.py
    requirements.txt

  frontend/
    src/
      app/              # Next.js App Router (dashboard, auth, projects)
      components/       # React Flow canvas, node cards, charts, modals
      hooks/            # useAuth authentication hook & context
      services/         # Axios central API client with token refresh
      types/            # Shared TypeScript interfaces
    package.json

  docs/
    architecture.md     # System architecture & sequence diagrams
    database-design.md  # ER diagram & database schema specifications
    api-documentation.md# REST API reference and payload schemas

  docker-compose.yml    # Local PostgreSQL container service
  README.md
  .gitignore
```

---

## Local Development Setup

### 1. Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: v18 or higher (v24 tested)
- **Docker** (optional, for running PostgreSQL via Docker Compose)

---

### 2. Database Options

#### Option A: Zero-Config SQLite (Default)
No setup required. FlowTrack automatically defaults to SQLite for immediate local execution and testing.

#### Option B: PostgreSQL with Docker Compose
If you wish to run PostgreSQL:
```bash
docker compose up -d
```
Then set environment variables in `backend/.env`:
```env
USE_POSTGRES=True
DB_NAME=flowtrack_db
DB_USER=flowtrack_user
DB_PASSWORD=flowtrack_password
DB_HOST=localhost
DB_PORT=5432
```

---

### 3. Backend Setup

1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run database migrations:
   ```bash
   python manage.py migrate
   ```

5. (Optional) Seed realistic demonstration data:
   ```bash
   python manage.py seed_demo
   ```
   *Creates user `demo` (password: `password123`) with pre-configured projects, task graphs, bottlenecks, and activity logs.*

6. Start the Django backend development server:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   The backend API will be available at `http://localhost:8000`.

---

### 4. Frontend Setup

1. Open a separate terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The application will be live at `http://localhost:3000`.

---

## Running Automated Tests

FlowTrack includes an automated test suite verifying user isolation, cycle detection, task completion rules, blocked state calculations, cascading deletions, and analytics.

To execute all backend tests:
```powershell
cd backend
.\venv\Scripts\python manage.py test tests
```

### Verified Test Cases
- User registration, duplicate username handling, and JWT token issuance.
- User data isolation (preventing cross-user access to projects or tasks).
- Project & Task CRUD lifecycles.
- Self-dependency rejection (`A -> A`).
- Cross-project dependency rejection.
- Duplicate dependency rejection.
- **DFS Cycle Detection**: Direct two-node cycles (`A -> B -> A`) and multi-node transitive cycles (`A -> B -> C -> A`).
- **Rule 5**: Strict restriction preventing task completion when prerequisites are incomplete.
- Dynamic blocked/unblocked state recalculation.
- Bottleneck scoring calculation (`downstream_count + 2 * overdue_flag`).
- Cascading deletion across projects, tasks, dependencies, and activity logs.
- React Flow graph endpoint and audit activity streaming.

To run frontend production build validation:
```bash
cd frontend
npm run build
```

---

## Preloaded Demo Credentials

If you ran `python manage.py seed_demo`:
- **Username**: `demo`
- **Password**: `password123`

The sign-in page also features an **Auto-fill** button to populate these credentials with one click.
