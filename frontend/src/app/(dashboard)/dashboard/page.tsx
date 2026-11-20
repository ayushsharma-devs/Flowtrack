'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ActivityStream } from '@/components/ActivityStream';
import { ProjectModal } from '@/components/ProjectModals';
import { OverallAnalytics, Project } from '@/types';
import { analyticsApi, projectsApi } from '@/services/api';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Folder,
} from 'lucide-react';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<OverallAnalytics | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, projectsRes] = await Promise.all([
        analyticsApi.getOverallAnalytics(),
        projectsApi.list(),
      ]);
      setAnalytics(analyticsRes.data);
      setProjects(projectsRes.data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Command Center"
        description="Monitor portfolio health, active bottlenecks, and dependency progress"
      />

      <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Welcome & Actions Row */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">System Overview</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time snapshot across all isolated personal projects.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Overdue Task Banner Alert if overdue tasks exist */}
        {analytics && analytics.overdue_tasks > 0 && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold">Overdue Attention Required:</span>{' '}
                <span>
                  You have {analytics.overdue_tasks} overdue task(s) currently past their deadline.
                </span>
              </div>
            </div>
            <Link
              href="/projects"
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg font-semibold transition-colors shrink-0"
            >
              Review Projects
            </Link>
          </div>
        )}

        {/* Global Statistics Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-900/50 rounded-xl animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Projects</span>
                <FolderKanban className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-2xl font-bold text-white">{analytics?.total_projects || 0}</span>
            </div>

            <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Tasks</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-2xl font-bold text-white">{analytics?.total_tasks || 0}</span>
            </div>

            <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
                <span>Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-emerald-400">{analytics?.completed_tasks || 0}</span>
            </div>

            <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-blue-400 text-xs mb-1">
                <span>In Progress</span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-blue-400">{analytics?.in_progress_tasks || 0}</span>
            </div>

            <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
                <span>Blocked</span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl font-bold text-amber-400">{analytics?.blocked_tasks || 0}</span>
            </div>

            <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-indigo-400 text-xs mb-1">
                <span>Overall Progress</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-2xl font-bold text-indigo-400">{analytics?.progress_percentage || 0}%</span>
            </div>
          </div>
        )}

        {/* Projects Section & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-indigo-400" />
                Active Projects ({projects.length})
              </h3>
              <Link
                href="/projects"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 bg-slate-900/40 rounded-xl animate-pulse border border-slate-800" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-[#111726] border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                <Folder className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No projects yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Create your first project to start managing tasks and dependency graphs.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Create Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="block bg-[#111726] border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition-all hover:shadow-xl group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                        {p.title}
                      </h4>
                      <span className="text-[11px] font-bold font-mono text-indigo-400 shrink-0">
                        {p.completion_percentage}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 min-h-[32px]">
                      {p.description || 'No description provided.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-3">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${p.completion_percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{p.total_tasks} tasks</span>
                      {p.blocked_tasks > 0 && (
                        <span className="text-amber-400 font-medium">
                          {p.blocked_tasks} blocked
                        </span>
                      )}
                      {p.overdue_tasks > 0 && (
                        <span className="text-rose-400 font-medium">
                          {p.overdue_tasks} overdue
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Activity Column */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Recent Activity Feed
            </h3>
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 max-h-[480px] overflow-y-auto">
              <ActivityStream />
            </div>
          </div>
        </div>
      </main>

      <ProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={fetchDashboardData}
      />
    </div>
  );
}
