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
import Header from '../components/Header';
import type { FilterItem } from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import RefreshButton from '../components/RefreshButton';
import ConfirmModal from '../components/ConfirmModal';
import CreatePipelineModal from '../components/CreatePipelineModal';
import { usePipelines, useRunPipeline, useDeletePipeline, useTogglePipeline } from '../hooks/usePipelines';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';
import type { Pipeline, PipelineRepo } from '../api';

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
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <Clock size={12} />, label: 'Pending' },
    running: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <Loader2 size={12} className="animate-spin" />, label: 'Running' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <CheckCircle2 size={12} />, label: 'Success' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <XCircle size={12} />, label: 'Failed' },
};

function StatusBadge({ status }: { status: string }) {
    const config = EXEC_STATUS_CONFIG[status] || EXEC_STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color} ${config.bg} border ${config.border}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

//  Action Menu (renders via portal to escape overflow-hidden)

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

    // Calculate position when opening
    const handleOpen = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + 4,
                left: rect.right - 176, // w-44 = 176px, align right edge
            });
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
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
                    className="w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
                    >
                        <Eye size={14} /> View
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onRun(); }}
                        disabled={isRunning || !isActive}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Run
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
                    >
                        {isActive ? <PauseCircle size={14} className="text-amber-400" /> : <PlayCircle size={14} className="text-emerald-400" />}
                        {isActive ? 'Pause' : 'Resume'}
                    </button>
                    <div className="border-t border-slate-700" />
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </motion.div>,
                document.body
            )}
        </>
    );
}

// Skeleton 

function TableSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 bg-slate-800/30 rounded-xl border border-slate-800/50">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-slate-800 rounded animate-pulse w-40" />
                        <div className="h-2.5 bg-slate-800/60 rounded animate-pulse w-56" />
                    </div>
                    <div className="h-6 w-20 bg-slate-800 rounded-lg animate-pulse" />
                    <div className="h-3 w-16 bg-slate-800/60 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

//  Page 

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

    // Unique repos for filter dropdown
    const uniqueRepos = useMemo(() => {
        const map = new Map<string, string>();
        pipelines.forEach(p => {
            const id = getRepoId(p.repo);
            const name = getRepoFullName(p.repo);
            if (!map.has(id)) map.set(id, name);
        });
        return Array.from(map.entries());
    }, [pipelines]);

    // Filtered pipelines
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

    // Filter items for header
    const filterItems: FilterItem[] = useMemo(() => [
        { key: 'all', label: 'All', count: pipelines.length, color: 'text-slate-100', activeBg: 'bg-slate-700', activeBorder: 'border-slate-600', icon: <GitMerge size={15} className="text-slate-400" /> },
    ], [pipelines]);

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header filterItems={filterItems} />
            <ResourceNav />

            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Page header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                                <GitMerge size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-100">Pipelines</h1>
                                <p className="text-slate-500 text-sm">
                                    {isLoading ? 'Loading…' : error ? 'Unable to load' : `${pipelines.length} pipeline${pipelines.length === 1 ? '' : 's'}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <RefreshButton onRefresh={() => { refetch(); }} isFetching={isFetching} size="md" />
                            <motion.button
                                onClick={() => setCreateModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Plus size={16} />
                                Create Pipeline
                            </motion.button>
                        </div>
                    </div>

                    {/* Search + Filter bar */}
                    {!isLoading && !error && pipelines.length > 0 && (
                        <div className="flex flex-col sm:flex-row gap-3 mb-6">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search pipelines…"
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
                                />
                            </div>
                            {uniqueRepos.length > 1 && (
                                <div className="relative">
                                    <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <select
                                        value={repoFilter}
                                        onChange={(e) => setRepoFilter(e.target.value)}
                                        className="bg-slate-800/50 border border-slate-700/50 rounded-xl pl-9 pr-8 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
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
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                                    <AlertCircle size={24} className="text-red-400" />
                                </div>
                                <h3 className="text-slate-200 font-semibold mb-2">Failed to load pipelines</h3>
                                <p className="text-slate-500 text-sm mb-5 max-w-xs">
                                    {(error as any)?.response?.data?.message ?? 'Could not reach the server.'}
                                </p>
                                <motion.button
                                    onClick={() => { refetch(); }}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600 text-sm font-medium transition-all"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <RotateCw size={14} />
                                    Try Again
                                </motion.button>
                            </motion.div>
                        ) : pipelines.length === 0 ? (
                            <motion.div
                                key="empty"
                                className="text-center py-20"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/50 flex items-center justify-center mx-auto mb-5">
                                    <GitMerge size={28} className="text-slate-600" />
                                </div>
                                <h3 className="text-slate-200 text-lg font-semibold mb-2">No pipelines yet</h3>
                                <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                                    Create your first CI/CD pipeline to automate builds, tests, and deployments.
                                </p>
                                <motion.button
                                    onClick={() => setCreateModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Plus size={16} />
                                    Create Pipeline
                                </motion.button>
                            </motion.div>
                        ) : filtered.length === 0 ? (
                            <motion.div
                                key="no-match"
                                className="text-center py-16"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Search size={32} className="mx-auto text-slate-700 mb-3" />
                                <p className="text-slate-500">No pipelines match your search</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="list"
                                className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {/* Table header */}
                                <div className="hidden sm:grid grid-cols-[1fr_140px_120px_100px_44px] gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    <span>Pipeline</span>
                                    <span>Last Run</span>
                                    <span>Updated</span>
                                    <span>Steps</span>
                                    <span />
                                </div>

                                {/* Rows */}
                                {filtered.map((pipeline) => (
                                    <div
                                        key={pipeline.id}
                                        onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                                        className="grid grid-cols-1 sm:grid-cols-[1fr_140px_120px_100px_44px] gap-3 sm:gap-4 items-center px-5 py-4 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors cursor-pointer group"
                                    >
                                        {/* Name + Repo */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                                                <GitMerge size={15} className="text-violet-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-white transition-colors">
                                                    {pipeline.name}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {getRepoFullName(pipeline.repo)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Last Run — status + time */}
                                        <div className="flex flex-col gap-1 items-start">
                                            {pipeline.status === 'inactive' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 bg-slate-500/10 border border-slate-500/30">
                                                    <PauseCircle size={12} />
                                                    Paused
                                                </span>
                                            ) : pipeline.lastRun ? (
                                                <>
                                                    <StatusBadge status={pipeline.lastRun.status} />
                                                    {pipeline.lastRun.startedAt && (
                                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {formatRelativeTime(pipeline.lastRun.startedAt)}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">No runs yet</span>
                                            )}
                                        </div>

                                        {/* Updated */}
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock size={11} />
                                            {formatRelativeTime(pipeline.updatedAt)}
                                        </span>

                                        {/* Steps count */}
                                        <span className="text-xs text-slate-500">
                                            {pipeline.steps?.length || 0} step{(pipeline.steps?.length || 0) !== 1 ? 's' : ''}
                                        </span>

                                        {/* ⋮ Menu  */}
                                        <ActionMenu
                                            onView={() => navigate(`/pipelines/${pipeline.id}`)}
                                            onRun={() => setRunConfirm({ open: true, pipeline })}
                                            onDelete={() => setDeleteConfirm({ open: true, pipeline })}
                                            onToggle={() => handleToggle(pipeline)}
                                            isRunning={runPipeline.isPending}
                                            isActive={pipeline.status === 'active'}
                                        />
                                    </div>
                                ))}
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
