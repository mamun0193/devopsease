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
import Header from '../components/Header';
import ResourceNav from '../components/ResourceNav';
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
    pending: <Clock size={16} className="text-slate-500" />,
    running: <Loader2 size={16} className="text-blue-400 animate-spin" />,
    success: <CheckCircle2 size={16} className="text-emerald-400" />,
    failed: <XCircle size={16} className="text-red-400" />,
    skipped: <SkipForward size={16} className="text-slate-500" />,
};

const STATUS_BADGE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Pending' },
    running: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Running' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Success' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Failed' },
};

//  Metric Card 

function MetricCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
    return (
        <motion.div
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon size={16} className="text-white" />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-lg font-bold text-slate-100">{value}</p>
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
        ? <CheckCircle2 size={14} className="text-emerald-400" />
        : run.status === 'failed'
            ? <XCircle size={14} className="text-red-400" />
            : isPaused
                ? <PauseCircle size={14} className="text-amber-400" />
                : run.status === 'running'
                    ? <Loader2 size={14} className="text-blue-400 animate-spin" />
                    : <Clock size={14} className="text-yellow-400" />;

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
            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-800/30 rounded-xl transition-colors w-full text-left group"
        >
            <div className="mt-0.5">{statusIcon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 group-hover:text-white transition-colors">{label}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
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
            <div className="min-h-screen flex flex-col bg-slate-950">
                <Header />
                <ResourceNav />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-slate-500" />
                </main>
            </div>
        );
    }

    if (pipelineError || !pipeline) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-950">
                <Header />
                <ResourceNav />
                <main className="flex-1 flex flex-col items-center justify-center py-20">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                        <AlertCircle size={24} className="text-red-400" />
                    </div>
                    <h3 className="text-slate-200 font-semibold mb-2">Pipeline not found</h3>
                    <p className="text-slate-500 text-sm mb-5">The pipeline may have been deleted or you don't have access.</p>
                    <button
                        onClick={() => navigate('/pipelines')}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                        ← Back to Pipelines
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header />
            <ResourceNav />

            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Page Header + Run Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/pipelines')} className="text-slate-400 hover:text-slate-200 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center">
                                    <GitMerge size={20} className="text-violet-400" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-100">{pipeline.name}</h1>
                                    <p className="text-sm text-slate-500">{getRepoFullName(pipeline.repo)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <RefreshButton onRefresh={() => { refetchPipeline(); }} isFetching={isFetching} size="md" />
                            <motion.button
                                onClick={handleToggle}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold transition-all"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={togglePipeline.isPending}
                            >
                                {pipeline.status === 'active' ? (
                                    <><PauseCircle size={15} className="text-amber-400" /> Pause</>
                                ) : (
                                    <><PlayCircle size={15} className="text-emerald-400" /> Resume</>
                                )}
                            </motion.button>
                            <motion.button
                                onClick={() => setRunConfirmOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={runPipeline.isPending || pipeline.status === 'inactive'}
                            >
                                {runPipeline.isPending ? (
                                    <><Loader2 size={15} className="animate-spin" /> Running…</>
                                ) : (
                                    <><Play size={15} /> Run Pipeline</>
                                )}
                            </motion.button>
                        </div>
                    </div>

                    {/* Overview Cards  */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
                            <div className="flex flex-col gap-1 items-start">
                                {pipeline.status === 'inactive' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-500/10 border border-slate-500/30">
                                        Paused
                                    </span>
                                ) : latestRun ? (
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${STATUS_BADGE_CONFIG[latestRun.status]?.color ?? 'text-slate-400'} ${STATUS_BADGE_CONFIG[latestRun.status]?.bg ?? ''} border ${STATUS_BADGE_CONFIG[latestRun.status]?.border ?? ''}`}>
                                        {STATUS_BADGE_CONFIG[latestRun.status]?.label ?? latestRun.status}
                                    </span>
                                ) : (
                                    <p className="text-sm text-slate-400">No runs yet</p>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Version</p>
                            <p className="text-lg font-bold text-slate-100">v{pipeline.version}</p>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Created</p>
                            <p className="text-sm font-medium text-slate-200">{formatRelativeTime(pipeline.createdAt)}</p>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Last Run</p>
                            <p className="text-sm font-medium text-slate-200">
                                {latestRun ? formatRelativeTime(latestRun.startedAt || latestRun.createdAt) : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Execution Flow */}
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Execution Flow</h2>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                            <div className="flex flex-col items-center">
                                {/* Repository node */}
                                <motion.div
                                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <GitBranch size={15} className="text-blue-400" />
                                    <span className="text-sm font-medium text-slate-200">Repository</span>
                                    <span className="text-xs text-slate-500 ml-1">{getRepoFullName(pipeline.repo)}</span>
                                </motion.div>

                                {/* Connector */}
                                <div className="w-px h-5 bg-slate-700" />
                                <div className="text-slate-600 text-xs">▼</div>
                                <div className="w-px h-2 bg-slate-700" />

                                {/* Pipeline node */}
                                <motion.div
                                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 }}
                                >
                                    <GitMerge size={15} className="text-violet-400" />
                                    <span className="text-sm font-medium text-slate-200">{pipeline.name}</span>
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
                                        ? 'bg-red-500/15 border-red-500/40'
                                        : isSuccess
                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                            : isPaused
                                                ? 'bg-amber-500/10 border-amber-500/30'
                                                : isRunning
                                                    ? 'bg-blue-500/10 border-blue-500/30'
                                                    : 'bg-slate-800/50 border-slate-700/50';

                                    const textColor = isFailed
                                        ? 'text-red-300'
                                        : isSuccess
                                            ? 'text-emerald-300'
                                            : isPaused
                                                ? 'text-amber-300'
                                                : isRunning
                                                    ? 'text-blue-300'
                                                    : 'text-slate-400';

                                    const connectorColor = isFailed ? 'bg-red-500/40' : isSuccess ? 'bg-emerald-500/30' : 'bg-slate-700';
                                    const arrowColor = isFailed ? 'text-red-500/60' : isSuccess ? 'text-emerald-500/50' : 'text-slate-600';

                                    const icon = isFailed
                                        ? <XCircle size={15} className="text-red-400" />
                                        : isSuccess
                                            ? <CheckCircle2 size={15} className="text-emerald-400" />
                                            : isPaused
                                                ? <PauseCircle size={15} className="text-amber-400" />
                                                : isRunning
                                                    ? <Loader2 size={15} className="text-blue-400 animate-spin" />
                                                    : <Clock size={15} className="text-slate-500" />;

                                    return (
                                        <React.Fragment key={stepName}>
                                            <div className={`w-px h-5 ${connectorColor}`} />
                                            <div className={`${arrowColor} text-xs`}>▼</div>
                                            <div className={`w-px h-2 ${connectorColor}`} />
                                            <motion.div
                                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${nodeColor} ${isFailed ? 'ring-1 ring-red-500/20' : ''}`}
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: (i + 2) * 0.05 }}
                                            >
                                                {icon}
                                                <span className={`text-sm font-medium capitalize ${textColor}`}>{stepName}</span>
                                                {runStep?.duration && (
                                                    <span className="text-xs text-slate-500 ml-1">{formatDuration(runStep.duration)}</span>
                                                )}
                                                {isFailed && (
                                                    <span className="text-xs text-red-400 ml-1 font-medium">← stopped here</span>
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
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Pipeline Steps</h2>
                        <div className="flex items-center gap-2">
                            {(pipeline.steps || []).map((stepName, i) => {
                                const runStep = latestRun?.steps?.find(s => s.name === stepName);
                                const status = runStep?.status ?? 'pending';
                                const isRunning = status === 'running';
                                const isPaused = pipeline.status === 'inactive' && isRunning;
                                
                                const icon = isPaused
                                    ? <PauseCircle size={16} className="text-amber-400" />
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
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                                                isClickable ? 'cursor-pointer hover:brightness-110' : ''
                                            } ${
                                                isPaused ? 'bg-amber-500/10 border-amber-500/30' :
                                                status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
                                                status === 'failed' ? 'bg-red-500/10 border-red-500/30' :
                                                status === 'running' ? 'bg-blue-500/10 border-blue-500/30' :
                                                status === 'skipped' ? 'bg-slate-800/30 border-slate-700/30' :
                                                'bg-slate-800/50 border-slate-700/50'
                                            }`}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                        >
                                            {icon}
                                            <span className="text-sm font-medium text-slate-200 capitalize">{stepName}</span>
                                            {runStep?.duration && (
                                                <span className="text-xs text-slate-500 ml-1">{formatDuration(runStep.duration)}</span>
                                            )}
                                        </motion.div>
                                        {i < (pipeline.steps?.length ?? 0) - 1 && (
                                            <div className="w-6 h-px bg-slate-700" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/*  Metrics (Last Successful Run) */}
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Metrics</h2>
                        {metrics ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                <MetricCard icon={BarChart3} label="Total Runs" value={metrics.totalRuns} color="bg-violet-600/20" />
                                <MetricCard icon={TrendingUp} label="Success Rate" value={successRate} color="bg-emerald-600/20" />
                                <MetricCard icon={XCircle} label="Failed Runs" value={metrics.failedRuns} color="bg-red-600/20" />
                                <MetricCard icon={Timer} label="Avg Duration" value={formatDuration(metrics.avgDurationMs)} color="bg-blue-600/20" />
                                <MetricCard icon={CheckCircle2} label="Last Success" value={lastSuccessfulRun} color="bg-teal-600/20" />
                            </div>
                        ) : (
                            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
                                <BarChart3 size={24} className="mx-auto text-slate-600 mb-2" />
                                <p className="text-slate-500 text-sm">No metrics data yet. Run the pipeline to see metrics.</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/*  Latest Activity */}
                        <div>
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Activity size={14} />
                                Latest Activity
                            </h2>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {runs.length === 0 ? (
                                        <motion.div
                                            key="empty"
                                            className="p-8 text-center"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            <Activity size={24} className="mx-auto text-slate-600 mb-2" />
                                            <p className="text-slate-500 text-sm">No activity yet</p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="list"
                                            className="divide-y divide-slate-800/50"
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

                        {/* Recent Commits (Added Feature) */}
                        <div>
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <GitCommitHorizontal size={14} />
                                Recent Commits
                            </h2>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                                {recentCommits.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <GitCommitHorizontal size={24} className="mx-auto text-slate-600 mb-2" />
                                        <p className="text-slate-500 text-sm">No commit data available</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-800/50">
                                        {recentCommits.map((commit) => (
                                            <button
                                                key={commit.runId}
                                                onClick={() => navigate(`/pipeline-runs/${commit.runId}`)}
                                                className="flex items-start gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors w-full text-left group"
                                            >
                                                <code className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">
                                                    {commit.hash}
                                                </code>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-200 truncate group-hover:text-white transition-colors">
                                                        {commit.message}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
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
