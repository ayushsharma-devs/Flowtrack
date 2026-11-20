'use client';

import React, { useState, useEffect } from 'react';
import { ProjectAnalytics } from '@/types';
import { analyticsApi } from '@/services/api';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Zap,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  ShieldAlert,
  Info,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface ProjectAnalyticsViewProps {
  projectId: number;
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#64748b',
  in_progress: '#3b82f6',
  completed: '#10b981',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#f43f5e',
  medium: '#f59e0b',
  low: '#64748b',
};

export function ProjectAnalyticsView({ projectId }: ProjectAnalyticsViewProps) {
  const [data, setData] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsApi.getProjectAnalytics(projectId);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load project analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        <span>Calculating project analytics & bottleneck scores...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <p>{error || 'No analytics data available.'}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-3 px-3 py-1.5 text-xs bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 block mb-1">Total Tasks</span>
          <span className="text-2xl font-bold text-slate-100">{data.total_tasks}</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-emerald-400 block mb-1">Completed</span>
          <span className="text-2xl font-bold text-emerald-400">{data.completed_tasks}</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-blue-400 block mb-1">In Progress</span>
          <span className="text-2xl font-bold text-blue-400">{data.in_progress_tasks}</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 block mb-1">Pending (To Do)</span>
          <span className="text-2xl font-bold text-slate-300">{data.todo_tasks}</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-amber-400 block mb-1">Blocked Tasks</span>
          <span className="text-2xl font-bold text-amber-400">{data.blocked_tasks}</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-rose-400 block mb-1">Overdue Tasks</span>
          <span className="text-2xl font-bold text-rose-400">{data.overdue_tasks}</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-indigo-400 block mb-1">Progress</span>
          <span className="text-2xl font-bold text-indigo-400">{data.progress_percentage}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-semibold text-slate-300">Project Completion Velocity</span>
          <span className="text-indigo-400 font-bold">{data.progress_percentage}% Completed</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(data.progress_percentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Task Status Distribution
          </h3>
          <div className="h-64 w-full">
            {data.total_tasks === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No tasks to chart
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.status_distribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {data.status_distribution.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] || '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            Task Priority Breakdown
          </h3>
          <div className="h-64 w-full">
            {data.total_tasks === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No tasks to chart
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.priority_distribution}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" allowDecimals={false} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {data.priority_distribution.map((entry) => (
                      <Cell
                        key={entry.priority}
                        fill={PRIORITY_COLORS[entry.priority] || '#64748b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottleneck Identification Section */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Dependency Bottleneck Identification
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies tasks with highest blocking impact across your dependency graph.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300">
            Score = Downstream Count + 2 × (Overdue Flag)
          </span>
        </div>

        {/* Heuristic Callout Notice */}
        <div className="mb-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {data.heuristic_note}
          </p>
        </div>

        {/* Bottlenecks Table */}
        {data.bottlenecks.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No bottlenecks identified. Add tasks and dependencies to evaluate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Task</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3 text-center">Downstream Blocked</th>
                  <th className="py-2.5 px-3 text-center">Overdue Penalty</th>
                  <th className="py-2.5 px-3 text-right">Bottleneck Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.bottlenecks.map((item, idx) => {
                  const isHighRisk = item.bottleneck_score >= 3;
                  return (
                    <tr
                      key={item.task_id}
                      className={`hover:bg-slate-900/50 transition-colors ${
                        isHighRisk ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          {isHighRisk && (
                            <span title="High Bottleneck Impact">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            </span>
                          )}
                          <span>#{item.task_id} {item.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge
                          status={item.status}
                          isBlocked={item.is_blocked}
                          isOverdue={item.is_overdue}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {item.downstream_task_count} tasks
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {item.overdue_flag === 1 ? (
                          <span className="text-rose-400 font-bold">+2 (Past Due)</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded text-xs ${
                            isHighRisk
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          {item.bottleneck_score}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
