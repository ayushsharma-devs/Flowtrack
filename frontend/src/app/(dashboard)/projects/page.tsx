'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ProjectModal } from '@/components/ProjectModals';
import { Project } from '@/types';
import { projectsApi } from '@/services/api';
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  MoreVertical,
  Edit,
  Trash2,
  Folder,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.list();
      setProjects(res.data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmDelete = window.confirm(
      `Are you sure you want to delete project "${project.title}"? This will permanently delete all associated tasks, dependency graphs, and activity records.`
    );
    if (!confirmDelete) return;

    try {
      await projectsApi.delete(project.id);
      fetchProjects();
    } catch {
      alert('Failed to delete project.');
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Projects"
        description="Organize work into isolated project graphs with distinct workflows"
      />

      <main className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Controls Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111726] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={() => {
              setProjectToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-slate-900/40 rounded-2xl animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Folder className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-200">No projects found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5 max-w-sm mx-auto">
              {search
                ? `No projects matching "${search}".`
                : 'Get started by creating your first project workspace.'}
            </p>
            <button
              onClick={() => {
                setProjectToEdit(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group relative bg-[#111726] border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-2xl"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                      {p.title}
                    </h3>

                    {/* Quick action icons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleEdit(p, e)}
                        title="Edit Project"
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(p, e)}
                        title="Delete Project"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 min-h-[32px]">
                    {p.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-indigo-400 font-bold font-mono">
                        {p.completion_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/80">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${p.completion_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Task metrics breakdown */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-500" />
                      {p.total_tasks} tasks ({p.completed_tasks} done)
                    </span>

                    {p.deadline ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(p.deadline).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span className="text-slate-600">No deadline</span>
                    )}
                  </div>

                  {/* Warning badges if blocked or overdue */}
                  {(p.blocked_tasks > 0 || p.overdue_tasks > 0) && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {p.blocked_tasks > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <ShieldAlert className="w-3 h-3" />
                          {p.blocked_tasks} Blocked
                        </span>
                      )}
                      {p.overdue_tasks > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          {p.overdue_tasks} Overdue
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchProjects}
        projectToEdit={projectToEdit}
      />
    </div>
  );
}
