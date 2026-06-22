import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitMerge,
    ArrowLeft,
    GitBranch,
    Play,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    BarChart3,
    Activity,
    GitCommitHorizontal,
    Zap,
    Timer,
    TrendingUp,
    SkipForward,
    PauseCircle,
    PlayCircle,
} from 'lucide-react';
import RefreshButton from '../components/RefreshButton';
import ConfirmModal from '../components/ConfirmModal';
import { usePipeline, usePipelineRuns, usePipelineMetrics, useRunPipeline, useTogglePipeline } from '../hooks/usePipelines';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';
import type { PipelineRepo, PipelineRun } from '../api';

//  Helpers 

function formatRelativeTime(dateString: string | null): string {
    if (!dateString) return '—';
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

function formatDuration(ms: number | null): string {
    if (!ms) return '—';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function getRepoFullName(repo: PipelineRepo | string | null): string {
    if (!repo) return 'Unknown';
    if (typeof repo === 'string') return repo;
    return `${repo.owner}/${repo.repoName}`;
}

const STEP_STATUS_ICON: Record<string, React.ReactNode> = {
    pending: <Clock size={16} className="text-dds-text-secondary" />,
    running: <Loader2 size={16} className="text-dds-blue animate-spin" />,
    success: <CheckCircle2 size={16} className="text-dds-green" />,
    failed: <XCircle size={16} className="text-dds-red" />,
    skipped: <SkipForward size={16} className="text-dds-text-muted" />,
};

const STATUS_BADGE_CONFIG: Record<string, { badgeClass: string; label: string }> = {
    pending: { badgeClass: 'badge badge-queued', label: 'Pending' },
    running: { badgeClass: 'badge badge-success', label: 'Running' },
    success: { badgeClass: 'badge badge-success', label: 'Success' },
    failed: { badgeClass: 'badge badge-failed', label: 'Failed' },
};

//  Metric Card 

function MetricCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
    return (
        <motion.div
            className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon size={16} className="text-white" />
                </div>
                <div>
                    <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">{label}</p>
                    <p className="text-[15px] font-bold text-dds-text-primary mt-0.5">{value}</p>
                </div>
            </div>
        </motion.div>
    );
}

//  Activity Feed Item 

function ActivityItem({ run, isPipelinePaused = false }: { run: PipelineRun; isPipelinePaused?: boolean }) {
    const navigate = useNavigate();
    const isPaused = isPipelinePaused && run.status === 'running';

    const statusIcon = run.status === 'success'
        ? <CheckCircle2 size={14} className="text-dds-green" />
        : run.status === 'failed'
            ? <XCircle size={14} className="text-dds-red" />
            : isPaused
                ? <PauseCircle size={14} className="text-dds-orange" />
                : run.status === 'running'
                    ? <Loader2 size={14} className="text-dds-blue animate-spin" />
                    : <Clock size={14} className="text-dds-text-secondary" />;

    const label = run.status === 'success'
        ? 'Pipeline completed'
        : run.status === 'failed'
            ? `Pipeline failed${run.error ? ` — ${run.steps.find(s => s.status === 'failed')?.name || 'unknown'} step` : ''}`
            : isPaused
                ? 'Pipeline paused'
                : run.status === 'running'
                    ? 'Pipeline running'
                    : 'Pipeline queued';

    return (
        <button
            onClick={() => navigate(`/pipeline-runs/${run._id}`)}
            className="flex items-start gap-3 px-4 py-3 hover:bg-dds-bg/80 rounded-none transition-colors w-full text-left group"
        >
            <div className="mt-0.5">{statusIcon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] text-dds-text-primary group-hover:text-dds-white transition-colors">{label}</p>
                <div className="flex items-center gap-3 mt-1 text-[12px] text-dds-text-muted">
                    <span>{formatRelativeTime(run.startedAt || run.createdAt)}</span>
                    {run.triggerSource && (
                        <span className="flex items-center gap-1">
                            <Zap size={10} />
                            {run.triggerSource}
                        </span>
                    )}
                    {run.duration && (
                        <span className="flex items-center gap-1">
                            <Timer size={10} />
                            {formatDuration(run.duration)}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

//  Page 

const PipelineDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { data: pipeline, isLoading: loadingPipeline, error: pipelineError, refetch: refetchPipeline, isFetching } = usePipeline(id!);
    const { data: runs = [] } = usePipelineRuns(id!);
    const { data: metrics } = usePipelineMetrics(id!);
    const runPipeline = useRunPipeline();
    const togglePipeline = useTogglePipeline();

    const [runConfirmOpen, setRunConfirmOpen] = React.useState(false);

    const handleRun = async () => {
        if (!id) return;
        try {
            const result = await runPipeline.mutateAsync({ pipelineId: id });
            dispatch(addToast({ message: `Pipeline "${pipeline?.name}" triggered`, type: 'success', duration: 3500 }));
            navigate(`/pipeline-runs/${result.runId}`);
        } catch (err: any) {
            dispatch(addToast({
                message: err?.response?.data?.message ?? 'Failed to run pipeline',
                type: 'error',
                duration: 5000,
            }));
        }
    };

    const handleToggle = async () => {
        if (!pipeline) return;
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

    // Latest run for step status display
    const latestRun = runs[0] ?? null;

    // Success rate calculation
    const successRate = useMemo(() => {
        if (!metrics || metrics.totalRuns === 0) return '—';
        const completedRuns = metrics.successfulRuns + metrics.failedRuns;
        if (completedRuns === 0) return '—';
        return `${Math.round((metrics.successfulRuns / completedRuns) * 100)}%`;
    }, [metrics]);

    // Last successful run
    const lastSuccessfulRun = useMemo(() => {
        const found = runs.find(r => r.status === 'success');
        return found ? formatRelativeTime(found.completedAt || found.startedAt) : '—';
    }, [runs]);

    // Recent commits from runs
    const recentCommits = useMemo(() => {
        return runs
            .filter(r => r.commitHash)
            .slice(0, 5)
            .map(r => ({
                hash: r.commitHash!.slice(0, 7),
                fullHash: r.commitHash!,
                message: r.commitMessage || 'No commit message',
                author: r.author || 'Unknown',
                time: formatRelativeTime(r.startedAt || r.createdAt),
                runId: r._id,
            }));
    }, [runs]);

    if (loadingPipeline) {
        return (
            <div className="min-h-screen flex flex-col bg-dds-bg">
                <main className="flex-1 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={32} className="animate-spin text-dds-primary" />
                    <p className="text-[13px] font-medium text-dds-text-muted tracking-wide">Loading pipeline details...</p>
                </main>
            </div>
        );
    }

    if (pipelineError || !pipeline) {
        return (
            <div className="min-h-screen flex flex-col bg-dds-bg">
                <main className="flex-1 flex flex-col items-center justify-center py-20 bg-dds-surface/50 m-8 rounded-xl border border-dds-border shadow-sm">
                    <div className="w-14 h-14 rounded-xl bg-dds-red/10 border border-dds-red/30 flex items-center justify-center mb-4">
                        <AlertCircle size={24} className="text-dds-red" />
                    </div>
                    <h3 className="text-dds-text-primary font-medium text-[15px] mb-2">Pipeline not found</h3>
                    <p className="text-dds-text-secondary text-[13px] mb-6">The pipeline may have been deleted or you don't have access.</p>
                    <button
                        onClick={() => navigate('/pipelines')}
                        className="btn-primary"
                    >
                        <ArrowLeft size={16} className="mr-1.5" /> Back to Pipelines
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-dds-bg">
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Page Header + Run Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/pipelines')} className="text-dds-text-secondary hover:text-dds-white transition-colors p-1.5 rounded-lg hover:bg-dds-surface">
                                <ArrowLeft size={18} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-dds-primary/10 border border-dds-primary/30 flex items-center justify-center shadow-sm">
                                    <GitMerge size={20} className="text-dds-primary" />
                                </div>
                                <div>
                                    <h1 className="text-base font-semibold text-dds-text-primary">{pipeline.name}</h1>
                                    <p className="text-[12px] text-dds-text-muted mt-0.5 font-mono">{getRepoFullName(pipeline.repo)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <RefreshButton onRefresh={() => { refetchPipeline(); }} isFetching={isFetching} size="md" />
                            <motion.button
                                onClick={handleToggle}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-dds-surface hover:bg-dds-bg border border-dds-border text-dds-text-primary text-[13px] font-medium transition-all shadow-sm"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={togglePipeline.isPending}
                            >
                                {pipeline.status === 'active' ? (
                                    <><PauseCircle size={15} className="text-dds-orange" /> Pause</>
                                ) : (
                                    <><PlayCircle size={15} className="text-dds-green" /> Resume</>
                                )}
                            </motion.button>
                            <motion.button
                                onClick={() => setRunConfirmOpen(true)}
                                className="btn-primary"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={runPipeline.isPending || pipeline.status === 'inactive'}
                            >
                                {runPipeline.isPending ? (
                                    <><Loader2 size={15} className="animate-spin mr-1.5" /> Running…</>
                                ) : (
                                    <><Play size={15} className="mr-1.5" /> Run Pipeline</>
                                )}
                            </motion.button>
                        </div>
                    </div>

                    {/* Overview Cards  */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm">
                            <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">Status</p>
                            <div className="flex flex-col gap-1 items-start">
                                {pipeline.status === 'inactive' ? (
                                    <span className="badge badge-queued">
                                        Paused
                                    </span>
                                ) : latestRun ? (
                                    <span className={STATUS_BADGE_CONFIG[latestRun.status]?.badgeClass ?? 'badge badge-queued'}>
                                        {STATUS_BADGE_CONFIG[latestRun.status]?.label ?? latestRun.status}
                                    </span>
                                ) : (
                                    <p className="text-[13px] text-dds-text-muted">No runs yet</p>
                                )}
                            </div>
                        </div>
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm">
                            <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">Version</p>
                            <p className="text-[15px] font-bold text-dds-text-primary">v{pipeline.version}</p>
                        </div>
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm">
                            <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">Created</p>
                            <p className="text-[13px] font-medium text-dds-text-primary">{formatRelativeTime(pipeline.createdAt)}</p>
                        </div>
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm">
                            <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">Last Run</p>
                            <p className="text-[13px] font-medium text-dds-text-primary">
                                {latestRun ? formatRelativeTime(latestRun.startedAt || latestRun.createdAt) : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Execution Flow */}
                    <div className="mb-8">
                        <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Activity size={14} className="text-dds-primary" /> Execution Flow
                        </h2>
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-6 shadow-sm overflow-x-auto">
                            <div className="flex flex-col items-center min-w-max">
                                {/* Repository node */}
                                <motion.div
                                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-dds-bg border border-dds-border/50 shadow-sm"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <GitBranch size={15} className="text-dds-blue" />
                                    <span className="text-[13px] font-medium text-dds-text-primary">Repository</span>
                                    <span className="text-[12px] text-dds-text-muted font-mono ml-1">{getRepoFullName(pipeline.repo)}</span>
                                </motion.div>

                                {/* Connector */}
                                <div className="w-px h-6 bg-dds-border" />
                                <div className="text-dds-border text-[10px] -mt-1">▼</div>
                                <div className="w-px h-2 bg-dds-border" />

                                {/* Pipeline node */}
                                <motion.div
                                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-dds-primary/10 border border-dds-primary/30 shadow-sm"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 }}
                                >
                                    <GitMerge size={15} className="text-dds-primary" />
                                    <span className="text-[13px] font-medium text-dds-text-primary">{pipeline.name}</span>
                                </motion.div>

                                {/* Step nodes */}
                                {(pipeline.steps || []).map((stepName, i) => {
                                    const runStep = latestRun?.steps?.find(s => s.name === stepName);
                                    const status = runStep?.status ?? 'pending';
                                    const isFailed = status === 'failed';
                                    const isSuccess = status === 'success';
                                    const isRunning = status === 'running';
                                    const isPaused = pipeline.status === 'inactive' && isRunning;

                                    const nodeColor = isFailed
                                        ? 'bg-dds-red/10 border-dds-red/30'
                                        : isSuccess
                                            ? 'bg-dds-green/10 border-dds-green/30'
                                            : isPaused
                                                ? 'bg-dds-orange/10 border-dds-orange/30'
                                                : isRunning
                                                    ? 'bg-dds-blue/10 border-dds-blue/30'
                                                    : 'bg-dds-bg border-dds-border/50';

                                    const textColor = isFailed
                                        ? 'text-dds-red'
                                        : isSuccess
                                            ? 'text-dds-green'
                                            : isPaused
                                                ? 'text-dds-orange'
                                                : isRunning
                                                    ? 'text-dds-blue'
                                                    : 'text-dds-text-secondary';

                                    const connectorColor = isFailed ? 'bg-dds-red/40' : isSuccess ? 'bg-dds-green/30' : 'bg-dds-border';
                                    const arrowColor = isFailed ? 'text-dds-red/60' : isSuccess ? 'text-dds-green/50' : 'text-dds-border';

                                    const icon = isFailed
                                        ? <XCircle size={15} className="text-dds-red" />
                                        : isSuccess
                                            ? <CheckCircle2 size={15} className="text-dds-green" />
                                            : isPaused
                                                ? <PauseCircle size={15} className="text-dds-orange" />
                                                : isRunning
                                                    ? <Loader2 size={15} className="text-dds-blue animate-spin" />
                                                    : <Clock size={15} className="text-dds-text-muted" />;

                                    return (
                                        <React.Fragment key={stepName}>
                                            <div className={`w-px h-6 ${connectorColor}`} />
                                            <div className={`${arrowColor} text-[10px] -mt-1`}>▼</div>
                                            <div className={`w-px h-2 ${connectorColor}`} />
                                            <motion.div
                                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-sm ${nodeColor} ${isFailed ? 'ring-1 ring-dds-red/20' : ''}`}
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: (i + 2) * 0.05 }}
                                            >
                                                {icon}
                                                <span className={`text-[13px] font-medium capitalize ${textColor}`}>{stepName}</span>
                                                {runStep?.duration && (
                                                    <span className="text-[11px] text-dds-text-muted font-mono ml-1.5">{formatDuration(runStep.duration)}</span>
                                                )}
                                                {isFailed && (
                                                    <span className="text-[11px] text-dds-red ml-1.5 font-medium uppercase tracking-wider">← stopped here</span>
                                                )}
                                            </motion.div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Steps  */}
                    <div className="mb-8">
                        <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                            <SkipForward size={14} className="text-dds-primary" /> Pipeline Steps
                        </h2>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {(pipeline.steps || []).map((stepName, i) => {
                                const runStep = latestRun?.steps?.find(s => s.name === stepName);
                                const status = runStep?.status ?? 'pending';
                                const isRunning = status === 'running';
                                const isPaused = pipeline.status === 'inactive' && isRunning;
                                
                                const icon = isPaused
                                    ? <PauseCircle size={16} className="text-dds-orange" />
                                    : STEP_STATUS_ICON[status] || STEP_STATUS_ICON.pending;
                                    
                                const isClickable = (stepName === 'build' && latestRun?.buildId) || (stepName === 'deploy' && latestRun?.deploymentId);
                                
                                const handleStepClick = () => {
                                    if (stepName === 'build' && latestRun?.buildId) navigate(`/builds/${latestRun.buildId}`);
                                    if (stepName === 'deploy' && latestRun?.deploymentId) navigate(`/deployments`);
                                };

                                return (
                                    <React.Fragment key={stepName}>
                                        <motion.div
                                            onClick={isClickable ? handleStepClick : undefined}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all shadow-sm shrink-0 ${
                                                isClickable ? 'cursor-pointer hover:brightness-110' : ''
                                            } ${
                                                isPaused ? 'bg-dds-orange/10 border-dds-orange/30' :
                                                status === 'success' ? 'bg-dds-green/10 border-dds-green/30' :
                                                status === 'failed' ? 'bg-dds-red/10 border-dds-red/30' :
                                                status === 'running' ? 'bg-dds-blue/10 border-dds-blue/30' :
                                                status === 'skipped' ? 'bg-dds-bg border-dds-border/50' :
                                                'bg-dds-surface border-dds-border'
                                            }`}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                        >
                                            {icon}
                                            <span className="text-[13px] font-medium text-dds-text-primary capitalize">{stepName}</span>
                                            {runStep?.duration && (
                                                <span className="text-[11px] font-mono text-dds-text-muted ml-1.5">{formatDuration(runStep.duration)}</span>
                                            )}
                                        </motion.div>
                                        {i < (pipeline.steps?.length ?? 0) - 1 && (
                                            <div className="w-6 h-px bg-dds-border shrink-0" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/*  Metrics (Last Successful Run) */}
                    <div className="mb-8">
                        <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BarChart3 size={14} className="text-dds-primary" /> Metrics
                        </h2>
                        {metrics ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                <MetricCard icon={BarChart3} label="Total Runs" value={metrics.totalRuns} color="bg-dds-primary" />
                                <MetricCard icon={TrendingUp} label="Success Rate" value={successRate} color="bg-dds-green" />
                                <MetricCard icon={XCircle} label="Failed Runs" value={metrics.failedRuns} color="bg-dds-red" />
                                <MetricCard icon={Timer} label="Avg Duration" value={formatDuration(metrics.avgDurationMs)} color="bg-dds-blue" />
                                <MetricCard icon={CheckCircle2} label="Last Success" value={lastSuccessfulRun} color="bg-dds-green/80" />
                            </div>
                        ) : (
                            <div className="bg-dds-surface border border-dds-border rounded-xl p-8 text-center shadow-sm">
                                <BarChart3 size={24} className="mx-auto text-dds-text-muted mb-3" />
                                <p className="text-dds-text-secondary text-[13px]">No metrics data yet. Run the pipeline to see metrics.</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/*  Latest Activity */}
                        <div>
                            <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity size={14} className="text-dds-primary" />
                                Latest Activity
                            </h2>
                            <div className="bg-dds-surface border border-dds-border rounded-xl overflow-hidden shadow-sm">
                                <AnimatePresence mode="wait">
                                    {runs.length === 0 ? (
                                        <motion.div
                                            key="empty"
                                            className="p-8 text-center"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            <Activity size={24} className="mx-auto text-dds-text-muted mb-3" />
                                            <p className="text-[13px] text-dds-text-secondary">No activity yet</p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="list"
                                            className="divide-y divide-dds-border/50"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            {runs.slice(0, 8).map((run) => (
                                                <ActivityItem key={run._id} run={run} isPipelinePaused={pipeline.status === 'inactive'} />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Recent Commits */}
                        <div>
                            <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                                <GitCommitHorizontal size={14} className="text-dds-primary" />
                                Recent Commits
                            </h2>
                            <div className="bg-dds-surface border border-dds-border rounded-xl overflow-hidden shadow-sm">
                                {recentCommits.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <GitCommitHorizontal size={24} className="mx-auto text-dds-text-muted mb-3" />
                                        <p className="text-[13px] text-dds-text-secondary">No commit data available</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-dds-border/50">
                                        {recentCommits.map((commit) => (
                                            <button
                                                key={commit.runId}
                                                onClick={() => navigate(`/pipeline-runs/${commit.runId}`)}
                                                className="flex items-start gap-4 px-4 py-3.5 hover:bg-dds-bg/80 transition-colors w-full text-left group"
                                            >
                                                <code className="text-[11px] font-mono text-dds-blue bg-dds-blue/10 border border-dds-blue/20 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
                                                    {commit.hash}
                                                </code>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] text-dds-text-primary truncate group-hover:text-dds-white transition-colors">
                                                        {commit.message}
                                                    </p>
                                                    <p className="text-[11px] text-dds-text-muted font-mono mt-1">
                                                        {commit.author} · {commit.time}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Run Confirmation */}
            <ConfirmModal
                isOpen={runConfirmOpen}
                onClose={() => setRunConfirmOpen(false)}
                onConfirm={() => {
                    setRunConfirmOpen(false);
                    handleRun();
                }}
                title="Run Pipeline"
                message={`Run "${pipeline.name}"? This will execute all configured steps.`}
                confirmLabel="Run Pipeline"
                cancelLabel="Cancel"
            />
        </div>
    );
};

export default PipelineDetailPage;
