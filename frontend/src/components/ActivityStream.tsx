'use client';

import React, { useState, useEffect } from 'react';
import { ActivityLog } from '@/types';
import { activityApi } from '@/services/api';
import {
  FolderPlus,
  Edit,
  CheckCircle2,
  Trash2,
  GitFork,
  Activity,
  Clock,
  RefreshCw,
  FolderMinus,
} from 'lucide-react';

interface ActivityStreamProps {
  projectId?: number;
}

export function ActivityStream({ projectId }: ActivityStreamProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = projectId
        ? await activityApi.getProjectActivity(projectId)
        : await activityApi.getRecentActivity();
      setActivities(res.data);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'project_created':
        return <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />;
      case 'project_updated':
        return <Edit className="w-3.5 h-3.5 text-slate-400" />;
      case 'project_deleted':
        return <FolderMinus className="w-3.5 h-3.5 text-rose-400" />;
      case 'task_created':
        return <Clock className="w-3.5 h-3.5 text-blue-400" />;
      case 'task_completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'task_updated':
        return <Edit className="w-3.5 h-3.5 text-amber-400" />;
      case 'task_deleted':
        return <Trash2 className="w-3.5 h-3.5 text-rose-400" />;
      case 'dependency_added':
      case 'dependency_removed':
        return <GitFork className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500 gap-2 text-xs">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Loading activity logs...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-xs">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((act) => (
        <div
          key={act.id}
          className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700/80 transition-colors"
        >
          <div className="p-2 rounded-lg bg-[#111726] border border-slate-800 shrink-0 mt-0.5">
            {getActionIcon(act.action)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-200 font-medium leading-snug">
              {act.description}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span className="text-slate-400 font-semibold">{act.username}</span>
              <span>•</span>
              {!projectId && act.project_title && (
                <>
                  <span className="text-indigo-400 truncate max-w-[140px]">{act.project_title}</span>
                  <span>•</span>
                </>
              )}
              <span>{new Date(act.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
