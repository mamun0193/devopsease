import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDOM from 'react-dom';
import {
    GitMerge,
    Plus,
    Search,
    Loader2,
    RotateCw,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    MoreVertical,
    Play,
    Eye,
    Trash2,
    Filter,
    PauseCircle,
    PlayCircle,
} from 'lucide-react';
import RefreshButton from '../components/RefreshButton';
import ConfirmModal from '../components/ConfirmModal';
import CreatePipelineModal from '../components/CreatePipelineModal';
import { usePipelines, useRunPipeline, useDeletePipeline, useTogglePipeline } from '../hooks/usePipelines';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';
import type { Pipeline, PipelineRepo } from '../api';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';

// Helpers
function formatRelativeTime(dateString: string): string {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    return new Date(dateString).toLocaleDateString();
}

function getRepoName(repo: PipelineRepo | string | null): string {
    if (!repo) return 'Unknown';
    if (typeof repo === 'string') return repo;
    return repo.repoName ?? 'Unknown';
}

function getRepoFullName(repo: PipelineRepo | string | null): string {
    if (!repo) return 'Unknown';
    if (typeof repo === 'string') return repo;
    return `${repo.owner}/${repo.repoName}`;
}

function getRepoId(repo: PipelineRepo | string | null): string {
    if (!repo) return '';
    if (typeof repo === 'string') return repo;
    return repo._id;
}

const EXEC_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    pending: { color: 'text-dds-yellow', bg: 'bg-dds-yellow/10', border: 'border-dds-yellow/30', icon: <Clock size={12} />, label: 'Pending' },
    running: { color: 'text-dds-blue', bg: 'bg-dds-blue/10', border: 'border-dds-blue/30', icon: <Loader2 size={12} className="animate-spin" />, label: 'Running' },
    success: { color: 'text-dds-green', bg: 'bg-dds-green/10', border: 'border-dds-green/30', icon: <CheckCircle2 size={12} />, label: 'Success' },
    failed: { color: 'text-dds-red', bg: 'bg-dds-red/10', border: 'border-dds-red/30', icon: <XCircle size={12} />, label: 'Failed' },
};

function StatusBadge({ status }: { status: string }) {
    const config = EXEC_STATUS_CONFIG[status] || EXEC_STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono tracking-wide ${config.color} ${config.bg} border ${config.border}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

function ActionMenu({
    onView,
    onRun,
    onDelete,
    onToggle,
    isRunning,
    isActive,
}: {
    onView: () => void;
    onRun: () => void;
    onDelete: () => void;
    onToggle: () => void;
    isRunning: boolean;
    isActive: boolean;
}) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const handleOpen = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 4, left: rect.right - 176 });
        }
        setOpen(prev => !prev);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target as Node) &&
                menuRef.current && !menuRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        const handleScroll = () => setOpen(false);
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [open]);

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleOpen}
                className="p-1.5 rounded-md text-dds-text-muted hover:text-dds-text-primary hover:bg-dds-muted transition-colors"
            >
                <MoreVertical size={16} />
            </button>
            {open && ReactDOM.createPortal(
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.1 }}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
                    className="w-44 bg-dds-elevated border border-dds-border rounded-lg shadow-2xl shadow-black/50 overflow-hidden"
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-dds-text-secondary hover:bg-dds-muted hover:text-dds-text-primary transition-colors"
                    >
                        <Eye size={14} /> View
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onRun(); }}
                        disabled={isRunning || !isActive}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-dds-text-secondary hover:bg-dds-muted hover:text-dds-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Run
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-dds-text-secondary hover:bg-dds-muted hover:text-dds-text-primary transition-colors"
                    >
                        {isActive ? <PauseCircle size={14} className="text-dds-orange" /> : <PlayCircle size={14} className="text-dds-green" />}
                        {isActive ? 'Pause' : 'Resume'}
                    </button>
                    <div className="border-t border-dds-border" />
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-dds-red hover:bg-dds-red/10 transition-colors"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </motion.div>,
                document.body
            )}
        </>
    );
}

function TableSkeleton() {
    return (
        <div className="card overflow-hidden">
            <table className="w-full text-left border-collapse">
                <tbody>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-dds-border">
                            <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-9 h-9 rounded-md flex-shrink-0" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-3.5 w-40" />
                                        <Skeleton className="h-2.5 w-56 bg-white/5" />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const PipelinesPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { data: pipelines = [], isLoading, isFetching, refetch, error } = usePipelines();
    const runPipeline = useRunPipeline();
    const deletePipeline = useDeletePipeline();
    const togglePipeline = useTogglePipeline();

    const [search, setSearch] = useState('');
    const [repoFilter, setRepoFilter] = useState<string>('all');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [runConfirm, setRunConfirm] = useState<{ open: boolean; pipeline: Pipeline | null }>({ open: false, pipeline: null });
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; pipeline: Pipeline | null }>({ open: false, pipeline: null });

    const uniqueRepos = useMemo(() => {
        const map = new Map<string, string>();
        pipelines.forEach(p => {
            const id = getRepoId(p.repo);
            const name = getRepoFullName(p.repo);
            if (!map.has(id)) map.set(id, name);
        });
        return Array.from(map.entries());
    }, [pipelines]);

    const filtered = useMemo(() => {
        let result = pipelines;
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                getRepoName(p.repo).toLowerCase().includes(q)
            );
        }
        if (repoFilter !== 'all') {
            result = result.filter(p => getRepoId(p.repo) === repoFilter);
        }
        return result;
    }, [pipelines, search, repoFilter]);

    const handleRun = async (pipeline: Pipeline) => {
        try {
            const result = await runPipeline.mutateAsync({ pipelineId: pipeline.id });
            dispatch(addToast({ message: `Pipeline "${pipeline.name}" triggered`, type: 'success', duration: 3500 }));
            navigate(`/pipeline-runs/${result.runId}`);
        } catch (err: any) {
            dispatch(addToast({
                message: err?.response?.data?.message ?? 'Failed to run pipeline',
                type: 'error',
                duration: 5000,
            }));
        }
    };

    const handleDelete = async (pipeline: Pipeline) => {
        try {
            await deletePipeline.mutateAsync(pipeline.id);
            dispatch(addToast({ message: `Pipeline "${pipeline.name}" deleted`, type: 'info', duration: 3500 }));
        } catch (err: any) {
            dispatch(addToast({
                message: err?.response?.data?.message ?? 'Failed to delete pipeline',
                type: 'error',
                duration: 5000,
            }));
        }
    };

    const handleToggle = async (pipeline: Pipeline) => {
        const newStatus = pipeline.status === 'active' ? 'inactive' : 'active';
        try {
            await togglePipeline.mutateAsync({ id: pipeline.id, status: newStatus });
            dispatch(addToast({
                message: `Pipeline "${pipeline.name}" ${newStatus === 'active' ? 'resumed' : 'paused'}`,
                type: 'success',
                duration: 3500,
            }));
        } catch (err: any) {
            dispatch(addToast({
                message: err?.response?.data?.message ?? 'Failed to update pipeline',
                type: 'error',
                duration: 5000,
            }));
        }
    };

    return (
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Page header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <GitMerge size={24} className="text-dds-text-primary" />
                            <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Pipelines</h1>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <RefreshButton onRefresh={() => { refetch(); }} isLoading={isFetching} size="md" />
                            <button
                                onClick={() => setCreateModalOpen(true)}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Create Pipeline
                            </button>
                        </div>
                    </div>

                    {/* Search + Filter bar */}
                    {!isLoading && !error && pipelines.length > 0 && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dds-text-muted" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search pipelines…"
                                    className="input pl-10"
                                />
                            </div>
                            {uniqueRepos.length > 1 && (
                                <div className="relative">
                                    <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dds-text-muted" />
                                    <select
                                        value={repoFilter}
                                        onChange={(e) => setRepoFilter(e.target.value)}
                                        className="input pl-9 pr-8 appearance-none cursor-pointer"
                                    >
                                        <option value="all">All repositories</option>
                                        {uniqueRepos.map(([id, name]) => (
                                            <option key={id} value={id}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <TableSkeleton />
                            </motion.div>
                        ) : error ? (
                            <motion.div
                                key="error"
                                className="flex flex-col items-center justify-center py-20 text-center"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="w-14 h-14 rounded-2xl bg-dds-red/10 border border-dds-red/30 flex items-center justify-center mb-4">
                                    <AlertCircle size={24} className="text-dds-red" />
                                </div>
                                <h3 className="text-dds-text-primary font-semibold mb-2">Failed to load pipelines</h3>
                                <p className="text-dds-text-secondary text-[13px] mb-5 max-w-xs">
                                    {(error as any)?.response?.data?.message ?? 'Could not reach the server.'}
                                </p>
                                <button
                                    onClick={() => { refetch(); }}
                                    className="btn-secondary"
                                >
                                    <RotateCw size={14} />
                                    Try Again
                                </button>
                            </motion.div>
                        ) : pipelines.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <EmptyState
                                    icon={<GitMerge className="h-10 w-10 text-dds-text-muted" />}
                                    title="No pipelines yet"
                                    description="Create your first CI/CD pipeline to automate builds, tests, and deployments."
                                    action={
                                        <button onClick={() => setCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
                                            <Plus size={16} />
                                            Create Pipeline
                                        </button>
                                    }
                                />
                            </motion.div>
                        ) : filtered.length === 0 ? (
                            <motion.div
                                key="no-match"
                                className="text-center py-16"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Search size={32} className="mx-auto text-dds-text-muted mb-3" />
                                <p className="text-dds-text-secondary">No pipelines match your search</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="list"
                                className="card overflow-x-auto"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b border-dds-border bg-dds-muted/50">
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Pipeline</th>
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Last Run</th>
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Updated</th>
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Steps</th>
                                            <th className="py-3 px-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((pipeline) => (
                                            <tr
                                                key={pipeline.id}
                                                onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                                                className="group border-b border-dds-border last:border-0 hover:bg-dds-muted/50 cursor-pointer transition-colors"
                                            >
                                                {/* Name + Repo */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <GitMerge size={16} className="text-dds-text-muted" />
                                                        <div>
                                                            <div className="text-[13px] font-medium text-dds-text-primary group-hover:text-white transition-colors">
                                                                {pipeline.name}
                                                            </div>
                                                            <div className="text-[11px] font-mono text-dds-text-secondary">
                                                                {getRepoFullName(pipeline.repo)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Last Run — status + time */}
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        {pipeline.status === 'inactive' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-dds-text-secondary bg-dds-muted border border-dds-border">
                                                                <PauseCircle size={12} />
                                                                Paused
                                                            </span>
                                                        ) : pipeline.lastRun ? (
                                                            <>
                                                                <StatusBadge status={pipeline.lastRun.status} />
                                                                {pipeline.lastRun.startedAt && (
                                                                    <span className="text-[10px] font-mono text-dds-text-muted flex items-center gap-1">
                                                                        <Clock size={10} />
                                                                        {formatRelativeTime(pipeline.lastRun.startedAt)}
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-[11px] text-dds-text-muted italic">No runs yet</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Updated */}
                                                <td className="py-3 px-4">
                                                    <span className="text-[12px] font-mono text-dds-text-secondary flex items-center gap-1.5">
                                                        <Clock size={12} className="text-dds-text-muted" />
                                                        {formatRelativeTime(pipeline.updatedAt)}
                                                    </span>
                                                </td>

                                                {/* Steps count */}
                                                <td className="py-3 px-4 text-[12px] font-mono text-dds-text-secondary">
                                                    {pipeline.steps?.length || 0}
                                                </td>

                                                {/* ⋮ Menu */}
                                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <ActionMenu
                                                        onView={() => navigate(`/pipelines/${pipeline.id}`)}
                                                        onRun={() => setRunConfirm({ open: true, pipeline })}
                                                        onDelete={() => setDeleteConfirm({ open: true, pipeline })}
                                                        onToggle={() => handleToggle(pipeline)}
                                                        isRunning={runPipeline.isPending}
                                                        isActive={pipeline.status === 'active'}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Create Modal */}
            <CreatePipelineModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={(id) => navigate(`/pipelines/${id}`)}
            />

            {/* Run Confirmation */}
            <ConfirmModal
                isOpen={runConfirm.open}
                onClose={() => setRunConfirm({ open: false, pipeline: null })}
                onConfirm={() => {
                    if (runConfirm.pipeline) handleRun(runConfirm.pipeline);
                    setRunConfirm({ open: false, pipeline: null });
                }}
                title="Run Pipeline"
                message={`Run "${runConfirm.pipeline?.name ?? 'this pipeline'}"? This will execute all configured steps.`}
                confirmLabel="Run Pipeline"
                cancelLabel="Cancel"
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, pipeline: null })}
                onConfirm={() => {
                    if (deleteConfirm.pipeline) handleDelete(deleteConfirm.pipeline);
                    setDeleteConfirm({ open: false, pipeline: null });
                }}
                title="Delete Pipeline"
                message={`Are you sure you want to delete "${deleteConfirm.pipeline?.name ?? 'this pipeline'}"? This action cannot be undone. All run history will also be removed.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isDangerous
            />
        </div>
    );
};

export default PipelinesPage;
