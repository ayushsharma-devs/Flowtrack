'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { TaskDependencyGraph } from '@/components/TaskDependencyGraph';
import { ProjectAnalyticsView } from '@/components/ProjectAnalyticsView';
import { ActivityStream } from '@/components/ActivityStream';
import { TaskModal } from '@/components/TaskModal';
import { ProjectModal } from '@/components/ProjectModals';
import { ProjectMembersList } from '@/components/ProjectMembersList';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Project, Task, TaskPriority, TaskStatus, MemberRole } from '@/types';
import { projectsApi, tasksApi } from '@/services/api';
import {
  FolderKanban,
  GitBranch,
  BarChart3,
  Activity,
  ListTodo,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Edit,
  Trash2,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Zap,
  Users,
  UserPlus,
  Crown,
  Shield,
  Edit2,
  Eye,
} from 'lucide-react';

type TabType = 'tasks' | 'graph' | 'analytics' | 'members' | 'activity';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('tasks');

  // Filters & sorting for Tasks tab
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('-created_at');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [taskActionError, setTaskActionError] = useState<string | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projectRes, tasksRes] = await Promise.all([
        projectsApi.get(projectId),
        tasksApi.listByProject(projectId, {
          status: statusFilter === 'all' ? undefined : statusFilter,
          priority: priorityFilter === 'all' ? undefined : priorityFilter,
          sort_by: sortBy,
          search: searchQuery || undefined,
        }),
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
    } catch {
      router.push('/projects');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, priorityFilter, sortBy, searchQuery, router]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Quick status change from Task list
  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    setTaskActionError(null);

    try {
      await tasksApi.update(task.id, { status: newStatus });
      fetchProjectData();
    } catch (err: any) {
      const errorDetail =
        err.response?.data?.status?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Cannot update task status.';
      setTaskActionError(errorDetail);
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  if (!project && loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
        <span className="text-sm">Loading project workspace...</span>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={project.title}
        description={project.description || 'FlowTrack Project Workspace'}
      />

      <div className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Project Header Info Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Project #{project.id}
                </span>
                {project.user_role && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      project.user_role === 'owner'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                        : project.user_role === 'admin'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                        : project.user_role === 'editor'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                    }`}
                  >
                    {project.user_role === 'owner' && <Crown className="w-3 h-3" />}
                    {project.user_role === 'admin' && <Shield className="w-3 h-3" />}
                    {project.user_role === 'editor' && <Edit2 className="w-3 h-3" />}
                    {project.user_role === 'viewer' && <Eye className="w-3 h-3" />}
                    Your Role: {project.user_role.toUpperCase()}
                  </span>
                )}
                {project.deadline && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Target: {new Date(project.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{project.title}</h2>
              {project.description && (
                <p className="text-xs text-slate-400 mt-1 max-w-3xl">{project.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {(project.user_role === 'owner' || project.user_role === 'admin') && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                  Invite Collaborator
                </button>
              )}
              {project.user_role !== 'viewer' && (
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Info
                </button>
              )}
              {project.user_role !== 'viewer' && (
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              )}
            </div>
          </div>

          {/* Quick Progress Indicator */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-400">Total Tasks:</span>{' '}
                <span className="font-bold text-slate-200">{project.total_tasks}</span>
              </div>
              <div>
                <span className="text-emerald-400">Completed:</span>{' '}
                <span className="font-bold text-emerald-400">{project.completed_tasks}</span>
              </div>
              {project.blocked_tasks > 0 && (
                <div className="text-amber-400 font-medium">
                  {project.blocked_tasks} Blocked
                </div>
              )}
              {project.overdue_tasks > 0 && (
                <div className="text-rose-400 font-medium">
                  {project.overdue_tasks} Overdue
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-64">
              <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.completion_percentage}%` }}
                />
              </div>
              <span className="font-mono font-bold text-indigo-400">
                {project.completion_percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Action Error Banner (e.g. Blocked task completion attempt) */}
        {taskActionError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{taskActionError}</span>
            </div>
            <button
              onClick={() => setTaskActionError(null)}
              className="px-2 py-1 text-[11px] rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'tasks'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Tasks List ({tasks.length})
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'graph'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Dependency Graph (DAG)
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics & Bottlenecks
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Team & Access ({project.members_count ?? 1})
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'activity'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Audit Activity
          </button>
        </div>

        {/* TAB 1: Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-[#111726] border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked Tasks</option>
                  <option value="overdue">Overdue Tasks</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" />
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="-created_at">Newest First</option>
                  <option value="created_at">Oldest First</option>
                  <option value="due_date">Earliest Due Date</option>
                  <option value="-due_date">Latest Due Date</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>

            {/* Tasks Table / List */}
            {tasks.length === 0 ? (
              <div className="bg-[#111726] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <ListTodo className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <h4 className="text-sm font-semibold text-slate-200">No tasks found</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Add tasks or adjust active filters.
                </p>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Add Task
                </button>
              </div>
            ) : (
              <div className="bg-[#111726] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="divide-y divide-slate-800/80">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 hover:bg-slate-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-slate-500">#{task.id}</span>
                          <h4
                            onClick={() => handleEditTask(task)}
                            className="text-sm font-semibold text-slate-100 hover:text-indigo-400 cursor-pointer transition-colors truncate max-w-md"
                          >
                            {task.title}
                          </h4>
                          <StatusBadge
                            status={task.status}
                            isBlocked={task.is_blocked}
                            isOverdue={task.is_overdue}
                          />
                          <PriorityBadge priority={task.priority} />
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-[11px] text-slate-500">
                          {task.due_date && (
                            <span className={task.is_overdue ? 'text-rose-400 font-medium' : ''}>
                              Due {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            Prerequisites: {task.prerequisites.length}
                          </span>
                          <span>
                            Downstream Dependents: {task.dependents.length}
                          </span>
                          {task.bottleneck_score > 0 && (
                            <span className="text-amber-400 font-mono font-bold flex items-center gap-0.5">
                              <Zap className="w-3 h-3" />
                              Score: {task.bottleneck_score}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quick Status Selector */}
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickStatusChange(task, e.target.value as TaskStatus)}
                          className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        <button
                          onClick={() => handleEditTask(task)}
                          title="Edit Task"
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Dependency Graph */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <TaskDependencyGraph
              projectId={projectId}
              onTaskUpdated={fetchProjectData}
            />
          </div>
        )}

        {/* TAB 3: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <ProjectAnalyticsView projectId={projectId} />
          </div>
        )}

        {/* TAB: Members & Access */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <ProjectMembersList
              projectId={projectId}
              projectOwnerId={project.owner}
              currentUserRole={project.user_role}
              onOpenInviteModal={() => setIsInviteModalOpen(true)}
              onProjectUpdated={fetchProjectData}
            />
          </div>
        )}

        {/* TAB 4: Activity */}
        {activeTab === 'activity' && (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Project Audit Activity Log
            </h3>
            <ActivityStream projectId={projectId} />
          </div>
        )}
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSaved={fetchProjectData}
        projectId={projectId}
        taskToEdit={taskToEdit}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSaved={fetchProjectData}
        projectToEdit={project}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={projectId}
        projectTitle={project.title}
        onMemberInvited={fetchProjectData}
      />
    </div>
  );
}
