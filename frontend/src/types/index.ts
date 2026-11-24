export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  date_joined?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface TaskBrief {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface Task {
  id: number;
  project: number;
  project_title?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  is_blocked: boolean;
  is_overdue: boolean;
  prerequisites: TaskBrief[];
  dependents: TaskBrief[];
  bottleneck_score: number;
}

export interface Project {
  id: number;
  owner: number;
  owner_username?: string;
  title: string;
  description: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  completion_percentage: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  user_role?: MemberRole;
  members_count?: number;
}

export interface TaskDependency {
  id: number;
  prerequisite_task: number;
  prerequisite_title?: string;
  dependent_task: number;
  dependent_title?: string;
  created_at: string;
}

export interface GraphNodeData extends Record<string, unknown> {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  is_blocked: boolean;
  is_overdue: boolean;
  bottleneck_score: number;
  prerequisite_count: number;
  dependent_count: number;
  onSelect?: (task: Task) => void;
}

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: GraphNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  dependency_id: number;
  animated?: boolean;
}

export interface GraphData {
  project_id: number;
  project_title: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BottleneckItem {
  task_id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  is_blocked: boolean;
  is_overdue: boolean;
  downstream_task_count: number;
  overdue_flag: number;
  bottleneck_score: number;
}

export interface ProjectAnalytics {
  project_id: number;
  project_title: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  progress_percentage: number;
  status_distribution: { name: string; status: string; count: number }[];
  priority_distribution: { name: string; priority: string; count: number }[];
  bottlenecks: BottleneckItem[];
  heuristic_note: string;
}

export interface OverallAnalytics {
  total_projects: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  progress_percentage: number;
  status_distribution: { name: string; status: string; count: number }[];
  priority_distribution: { name: string; priority: string; count: number }[];
}

export interface ActivityLog {
  id: number;
  project: number;
  project_title?: string;
  user: number | null;
  username: string;
  action: string;
  description: string;
  entity_type: string;
  entity_id: number | null;
  created_at: string;
}

export interface ProjectMember {
  id: number;
  user: User;
  role: MemberRole;
  joined_at: string;
}

export interface ProjectInvitation {
  id: number;
  project: {
    id: number;
    title: string;
  };
  invited_by: string;
  email: string;
  role: MemberRole;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}
