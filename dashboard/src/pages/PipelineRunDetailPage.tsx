import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    AlertCircle,
    GitBranch,
    GitCommitHorizontal,
    Zap,
    Timer,
    Copy,
    Download,
    ArrowDown,
    ArrowUp,
    Hammer,
    Rocket,
    ExternalLink,
    WifiOff,
    SkipForward,
    ScrollText,
} from 'lucide-react';
import Header from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import { usePipelineRun } from '../hooks/usePipelines';
import { usePipelineSocket } from '../hooks/usePipelineSocket';
import { pipelineApi } from '../api';
import type { PipelineStep } from '../api';

//  Helpers

function formatDuration(ms: number | null): string {
    if (!ms) return '—';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function formatTimestamp(dateString: string | null): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
}

const STEP_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    pending: { color: 'text-slate-400', bg: 'bg-slate-800/50', border: 'border-slate-700/50', icon: <Clock size={16} className="text-slate-500" />, label: 'Pending' },
    running: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <Loader2 size={16} className="text-blue-400 animate-spin" />, label: 'Running' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <CheckCircle2 size={16} className="text-emerald-400" />, label: 'Success' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <XCircle size={16} className="text-red-400" />, label: 'Failed' },
    skipped: { color: 'text-slate-500', bg: 'bg-slate-800/30', border: 'border-slate-700/30', icon: <SkipForward size={16} className="text-slate-500" />, label: 'Skipped' },
};

const RUN_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400', label: 'Pending' },
    running: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400 animate-pulse', label: 'Running' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Success' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400', label: 'Failed' },
};

// Step Timeline

function StepTimeline({ steps }: { steps: PipelineStep[] }) {
    return (
        <div className="space-y-1">
            {steps.map((step, i) => {
                const config = STEP_STATUS_CONFIG[step.status] || STEP_STATUS_CONFIG.pending;
                return (
                    <motion.div
                        key={step.name}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${config.bg} ${config.border} transition-colors`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                    >
                        <div className="flex-shrink-0">{config.icon}</div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium capitalize ${config.color}`}>{step.name}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                {step.startedAt && <span>Started {formatTimestamp(step.startedAt)}</span>}
                                {step.completedAt && <span>Completed {formatTimestamp(step.completedAt)}</span>}
                            </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                            {step.duration ? (
                                <span className="text-sm font-medium text-slate-300 flex items-center gap-1">
                                    <Timer size={12} className="text-slate-500" />
                                    {formatDuration(step.duration)}
                                </span>
                            ) : step.status === 'running' ? (
                                <span className="text-xs text-blue-400">In progress…</span>
                            ) : null}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

//  Log Viewer

function LogPanel({ runId, wsLogs, isActive }: { runId: string; wsLogs: string[]; isActive: boolean }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch logs via streaming fetch
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = pipelineApi.getRunLogsUrl(runId);
            const response = await fetch(url, { credentials: 'include' });
            if (!response.ok) {
                if (response.status === 404) {
                    setLogs([]);
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            const lines: string[] = [];

            if (reader) {
                let done = false;
                while (!done) {
                    const result = await reader.read();
                    done = result.done;
                    if (result.value) {
                        const chunk = decoder.decode(result.value, { stream: !done });
                        const newLines = chunk.split('\n').filter(l => l.trim());
                        lines.push(...newLines);
                        setLogs([...lines]);
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load logs');
        } finally {
            setLoading(false);
        }
    }, [runId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Merge WS logs with fetched logs
    const allLogs = useMemo(() => {
        const combined = [...logs];
        wsLogs.forEach(line => {
            if (!combined.includes(line)) combined.push(line);
        });
        return combined;
    }, [logs, wsLogs]);

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [allLogs, autoScroll]);

    const handleCopy = () => {
        navigator.clipboard.writeText(allLogs.join('\n'));
    };

    const handleDownload = () => {
        const blob = new Blob([allLogs.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pipeline-run-${runId}.log`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ScrollText size={14} />
                    <span>{allLogs.length} line{allLogs.length !== 1 ? 's' : ''}</span>
                    {isActive && <span className="flex items-center gap-1 text-blue-400"><Loader2 size={10} className="animate-spin" /> Live</span>}
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            autoScroll
                                ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                                : 'text-slate-400 bg-slate-800 border-slate-700 hover:text-slate-200'
                        }`}
                        title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
                    >
                        {autoScroll ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                        Auto-scroll
                    </button>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-800 border border-slate-700 hover:text-slate-200 hover:border-slate-600 transition-all"
                        title="Copy logs"
                    >
                        <Copy size={12} />
                        Copy
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-800 border border-slate-700 hover:text-slate-200 hover:border-slate-600 transition-all"
                        title="Download logs"
                    >
                        <Download size={12} />
                    </button>
                </div>
            </div>

            {/* Log content */}
            <div
                ref={containerRef}
                className="h-80 overflow-y-auto font-mono text-xs leading-5 p-4 bg-slate-950/80"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
            >
                {loading && allLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 size={14} className="animate-spin" />
                        Loading logs…
                    </div>
                ) : error ? (
                    <div className="text-red-400 flex items-center gap-2">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                ) : allLogs.length === 0 ? (
                    <p className="text-slate-600">No logs available yet.</p>
                ) : (
                    allLogs.map((line: string, i: number) => (
                        <div
                            key={i}
                            className={`py-0.5 px-1 rounded hover:bg-slate-800/50 ${
                                line.includes('[step:') && line.includes('failed')
                                    ? 'text-red-400'
                                    : line.includes('[step:') && line.includes('success')
                                        ? 'text-emerald-400'
                                        : line.includes('[step:') && line.includes('started')
                                            ? 'text-blue-400'
                                            : line.includes('ERROR') || line.includes('error')
                                                ? 'text-red-300'
                                                : line.includes('WARNING') || line.includes('warn')
                                                    ? 'text-yellow-300'
                                                    : 'text-slate-400'
                            }`}
                        >
                            <span className="text-slate-600 select-none mr-3">{String(i + 1).padStart(3, ' ')}</span>
                            {line}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Page

const PipelineRunDetailPage: React.FC = () => {
    const { id: runId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: run, isLoading, error } = usePipelineRun(runId!);
    const isActive = run?.status === 'pending' || run?.status === 'running';

    // WebSocket for live updates
    const { logs: wsLogs, wsUnavailable } = usePipelineSocket({
        runId: runId!,
        enabled: !!isActive,
    });

    if (isLoading) {
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

    if (error || !run) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-950">
                <Header />
                <ResourceNav />
                <main className="flex-1 flex flex-col items-center justify-center py-20">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                        <AlertCircle size={24} className="text-red-400" />
                    </div>
                    <h3 className="text-slate-200 font-semibold mb-2">Pipeline run not found</h3>
                    <p className="text-slate-500 text-sm mb-5">The run may have been deleted or you don't have access.</p>
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

    const statusConfig = RUN_STATUS_CONFIG[run.status] || RUN_STATUS_CONFIG.pending;
    const shortHash = run.commitHash?.slice(0, 7);

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header />
            <ResourceNav />

            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {isActive && wsUnavailable && (
                        <motion.div
                            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <WifiOff size={16} />
                            <span>Live updates unavailable — data refreshes every few seconds via polling.</span>
                        </motion.div>
                    )}

                    {/* Page Header  */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-200 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold text-slate-100">Pipeline Run</h1>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.color} ${statusConfig.bg} border ${statusConfig.border}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                                        {statusConfig.label}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                    Run ID: <code className="text-slate-400">{runId?.slice(-8)}</code>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Execution Summary */}
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Execution Summary</h2>
                        <motion.div
                            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-4 gap-x-6">
                                {/* Status */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.color} ${statusConfig.bg} border ${statusConfig.border}`}>
                                        {run.status === 'success' && <CheckCircle2 size={12} />}
                                        {run.status === 'failed' && <XCircle size={12} />}
                                        {run.status === 'running' && <Loader2 size={12} className="animate-spin" />}
                                        {run.status === 'pending' && <Clock size={12} />}
                                        {statusConfig.label}
                                    </span>
                                </div>

                                {/* Duration */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <Timer size={10} /> Duration
                                    </p>
                                    <p className="text-sm font-semibold text-slate-100">{formatDuration(run.duration)}</p>
                                </div>

                                {/* Commit */}
                                {shortHash && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                            <GitCommitHorizontal size={10} /> Commit
                                        </p>
                                        <div>
                                            <code className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{shortHash}</code>
                                            {run.commitMessage && (
                                                <p className="text-xs text-slate-500 mt-1 truncate max-w-48">{run.commitMessage}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Trigger */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <Zap size={10} /> Triggered by
                                    </p>
                                    <p className="text-sm font-semibold text-slate-100 capitalize">{run.triggerSource}</p>
                                </div>

                                {/* Branch */}
                                {run.branch && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                            <GitBranch size={10} /> Branch
                                        </p>
                                        <p className="text-sm font-semibold text-slate-100">{run.branch}</p>
                                    </div>
                                )}

                                {/* Started */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <Clock size={10} /> Started
                                    </p>
                                    <p className="text-sm font-medium text-slate-200">{formatTimestamp(run.startedAt)}</p>
                                </div>

                                {/* Completed */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Completed
                                    </p>
                                    <p className="text-sm font-medium text-slate-200">{formatTimestamp(run.completedAt)}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Step Timeline  */}
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Step Timeline</h2>
                        {run.steps && run.steps.length > 0 ? (
                            <StepTimeline steps={run.steps} />
                        ) : (
                            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 text-center">
                                <p className="text-slate-500 text-sm">No step data available</p>
                            </div>
                        )}
                    </div>

                    {/*  Artifacts   */}
                    {(run.buildId || run.deploymentId) && (
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Artifacts</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {run.buildId && (
                                    <button
                                        onClick={() => navigate(`/builds/${run.buildId}`)}
                                        className="flex items-center gap-3 px-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all text-left group"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                            <Hammer size={16} className="text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Build</p>
                                            <p className="text-xs text-slate-500">View build details and logs</p>
                                        </div>
                                        <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                    </button>
                                )}
                                {run.deploymentId && (
                                    <button
                                        onClick={() => navigate(`/deployments`)}
                                        className="flex items-center gap-3 px-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all text-left group"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                            <Rocket size={16} className="text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Deployment</p>
                                            <p className="text-xs text-slate-500">View deployment status</p>
                                        </div>
                                        <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/*  Error Message  */}
                    {run.error && (
                        <div className="mb-8">
                            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-300">Error</p>
                                    <p className="text-sm text-red-400/80 mt-0.5">{run.error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/*  Logs  */}
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <ScrollText size={14} />
                            Logs
                        </h2>
                        <LogPanel runId={runId!} wsLogs={wsLogs} isActive={!!isActive} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PipelineRunDetailPage;
