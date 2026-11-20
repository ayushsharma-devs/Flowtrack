'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';

import { GraphData, Task } from '@/types';
import { CustomTaskNode } from './CustomTaskNode';
import { dependenciesApi, graphApi, tasksApi } from '@/services/api';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import {
  RefreshCw,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface TaskDependencyGraphProps {
  projectId: number;
  onTaskUpdated?: () => void;
}

const nodeWidth = 260;
const nodeHeight = 120;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 80,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - nodeWidth / 2 : 0,
        y: nodeWithPosition ? nodeWithPosition.y - nodeHeight / 2 : 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export function TaskDependencyGraph({ projectId, onTaskUpdated }: TaskDependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddingDep, setIsAddingDep] = useState<boolean>(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [newPrereqId, setNewPrereqId] = useState<number | ''>('');
  const [newDepId, setNewDepId] = useState<number | ''>('');
  const [depLoading, setDepLoading] = useState<boolean>(false);

  const nodeTypes = useMemo(() => ({ customTaskNode: CustomTaskNode }), []);

  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [graphRes, tasksRes] = await Promise.all([
        graphApi.getProjectGraph(projectId),
        tasksApi.listByProject(projectId),
      ]);

      setAllTasks(tasksRes.data);

      const rawNodes: Node[] = graphRes.data.nodes.map((n) => ({
        id: n.id,
        type: 'customTaskNode',
        data: n.data as unknown as Record<string, unknown>,
        position: { x: 0, y: 0 },
      }));

      const rawEdges: Edge[] = graphRes.data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: e.animated,
        data: { dependencyId: e.dependency_id },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: e.animated ? '#f59e0b' : '#64748b',
          width: 18,
          height: 18,
        },
        style: {
          stroke: e.animated ? '#f59e0b' : '#64748b',
          strokeWidth: 2,
        },
      }));

      const layouted = getLayoutedElements(rawNodes, rawEdges, 'TB');
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load project graph.');
    } finally {
      setLoading(false);
    }
  }, [projectId, setNodes, setEdges]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Handle drag-and-drop connection between handles
  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;
      setError(null);
      setSuccessMsg(null);

      try {
        await dependenciesApi.create({
          prerequisite_task: parseInt(params.source),
          dependent_task: parseInt(params.target),
        });

        setSuccessMsg('Dependency successfully created!');
        fetchGraph();
        if (onTaskUpdated) onTaskUpdated();
      } catch (err: any) {
        const errorDetail =
          err.response?.data?.non_field_errors?.[0] ||
          err.response?.data?.detail ||
          'Failed to add dependency relationship.';
        setError(errorDetail);
      }
    },
    [fetchGraph, onTaskUpdated]
  );

  // Manual dependency creation via dialog
  const handleCreateDependencyManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrereqId || !newDepId) return;
    setDepLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await dependenciesApi.create({
        prerequisite_task: Number(newPrereqId),
        dependent_task: Number(newDepId),
      });

      setSuccessMsg('Dependency relationship added successfully!');
      setIsAddingDep(false);
      setNewPrereqId('');
      setNewDepId('');
      fetchGraph();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Failed to create dependency.';
      setError(errorMsg);
    } finally {
      setDepLoading(false);
    }
  };

  // Node click handler
  const onNodeClick = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      try {
        const taskId = parseInt(node.id);
        const { data } = await tasksApi.get(taskId);
        setSelectedTask(data);
      } catch {
        setSelectedTask(null);
      }
    },
    []
  );

  // Edge click handler to delete dependency
  const onEdgeClick = useCallback(
    async (_: React.MouseEvent, edge: Edge) => {
      const depId = edge.data?.dependencyId as number;
      if (!depId) return;

      const confirmDelete = window.confirm('Do you want to remove this dependency relationship?');
      if (!confirmDelete) return;

      try {
        await dependenciesApi.delete(depId);
        setSuccessMsg('Dependency removed successfully.');
        fetchGraph();
        if (onTaskUpdated) onTaskUpdated();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to remove dependency.');
      }
    },
    [fetchGraph, onTaskUpdated]
  );

  return (
    <div className="relative w-full h-[650px] bg-[#090d16] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111726]/80 backdrop-blur border-b border-slate-800 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">Task Dependency Directed Graph</span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              G = (V, E)
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Drag from bottom handle to top handle to add a dependency edge.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingDep(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Dependency
          </button>
          <button
            onClick={fetchGraph}
            title="Refresh Graph"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications Banner */}
      {error && (
        <div className="absolute top-14 left-4 right-4 z-20 flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="absolute top-14 left-4 right-4 z-20 flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        {loading && nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Rendering dependency graph...</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
            <Layers className="w-12 h-12 text-slate-600 mb-3" />
            <h4 className="text-base font-semibold text-slate-300">No tasks in this project yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Create tasks in the Tasks tab to start visualizing and managing dependency relationships.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.8}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="bg-[#111726] border-slate-800 fill-slate-300 text-slate-300" />
            <MiniMap
              nodeColor={(node) => {
                const data = node.data as any;
                if (data?.is_blocked) return '#f59e0b';
                if (data?.status === 'completed') return '#10b981';
                if (data?.status === 'in_progress') return '#3b82f6';
                return '#475569';
              }}
              maskColor="rgba(9, 13, 22, 0.7)"
              className="bg-[#111726] border border-slate-800 rounded-lg"
            />
          </ReactFlow>
        )}
      </div>

      {/* Graph Legend */}
      <div className="px-4 py-2 bg-[#111726]/90 border-t border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-3 text-slate-400 z-10">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-medium text-slate-300">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> To Do
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> In Progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Blocked (Prerequisite incomplete)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Overdue
          </span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Click edge to delete • Click node for details
        </div>
      </div>

      {/* Selected Task Inspector Drawer */}
      {selectedTask && (
        <div className="absolute top-14 right-4 w-80 bg-[#111726] border border-slate-700/80 rounded-xl shadow-2xl p-4 z-20 flex flex-col gap-3 backdrop-blur max-h-[550px] overflow-y-auto">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-slate-100 text-sm leading-snug">{selectedTask.title}</h4>
            <button
              onClick={() => setSelectedTask(null)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge
              status={selectedTask.status}
              isBlocked={selectedTask.is_blocked}
              isOverdue={selectedTask.is_overdue}
            />
            <PriorityBadge priority={selectedTask.priority} />
          </div>

          {selectedTask.description && (
            <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              {selectedTask.description}
            </p>
          )}

          <div className="text-xs space-y-1 text-slate-400">
            {selectedTask.due_date && (
              <div className="flex items-center justify-between">
                <span>Deadline:</span>
                <span className={selectedTask.is_overdue ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
                  {new Date(selectedTask.due_date).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Bottleneck Score:</span>
              <span className="text-amber-400 font-bold">{selectedTask.bottleneck_score}</span>
            </div>
          </div>

          {/* Upstream Prerequisites */}
          <div className="border-t border-slate-800 pt-2 mt-1">
            <span className="text-xs font-semibold text-slate-300 block mb-1.5">
              Prerequisites ({selectedTask.prerequisites.length}):
            </span>
            {selectedTask.prerequisites.length === 0 ? (
              <span className="text-[11px] text-slate-500 italic">No prerequisites (Can start immediately)</span>
            ) : (
              <div className="space-y-1">
                {selectedTask.prerequisites.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-[11px] bg-slate-900/70 px-2 py-1.5 rounded border border-slate-800"
                  >
                    <span className="truncate max-w-[150px] text-slate-200">{p.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        p.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Downstream Dependents */}
          <div className="border-t border-slate-800 pt-2">
            <span className="text-xs font-semibold text-slate-300 block mb-1.5">
              Dependent Tasks ({selectedTask.dependents.length}):
            </span>
            {selectedTask.dependents.length === 0 ? (
              <span className="text-[11px] text-slate-500 italic">No tasks depend on this</span>
            ) : (
              <div className="space-y-1">
                {selectedTask.dependents.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between text-[11px] bg-slate-900/70 px-2 py-1.5 rounded border border-slate-800"
                  >
                    <span className="truncate max-w-[150px] text-slate-200">{d.title}</span>
                    <span className="text-[10px] text-slate-400">{d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Add Dependency Modal */}
      {isAddingDep && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111726] border border-slate-700 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-indigo-400" />
                Define Task Dependency Edge
              </h3>
              <button
                onClick={() => setIsAddingDep(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDependencyManual} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  1. Prerequisite Task (Must complete first):
                </label>
                <select
                  value={newPrereqId}
                  onChange={(e) => setNewPrereqId(Number(e.target.value))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Prerequisite Task...</option>
                  {allTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} - {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  2. Dependent Task (Blocked until prerequisite finishes):
                </label>
                <select
                  value={newDepId}
                  onChange={(e) => setNewDepId(Number(e.target.value))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Dependent Task...</option>
                  {allTasks
                    .filter((t) => t.id !== newPrereqId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.id} - {t.title} ({t.status})
                      </option>
                    ))}
                </select>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Rules enforced by FlowTrack backend:</p>
                <p>• Cannot depend on itself.</p>
                <p>• Circular dependency cycles are rejected via DFS graph traversal.</p>
                <p>• Dependent tasks cannot be marked completed until all prerequisites finish.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDep(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={depLoading || !newPrereqId || !newDepId}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {depLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Create Dependency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
