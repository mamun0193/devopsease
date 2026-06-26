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
    Activity,
} from 'lucide-react';
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
    pending: { color: 'text-dds-text-secondary', bg: 'bg-dds-surface', border: 'border-dds-border', icon: <Clock size={16} className="text-dds-text-muted" />, label: 'Pending' },
    running: { color: 'text-dds-blue', bg: 'bg-dds-blue/10', border: 'border-dds-blue/30', icon: <Loader2 size={16} className="text-dds-blue animate-spin" />, label: 'Running' },
    success: { color: 'text-dds-green', bg: 'bg-dds-green/10', border: 'border-dds-green/30', icon: <CheckCircle2 size={16} className="text-dds-green" />, label: 'Success' },
    failed: { color: 'text-dds-red', bg: 'bg-dds-red/10', border: 'border-dds-red/30', icon: <XCircle size={16} className="text-dds-red" />, label: 'Failed' },
    skipped: { color: 'text-dds-text-muted', bg: 'bg-dds-bg', border: 'border-dds-border/50', icon: <SkipForward size={16} className="text-dds-text-muted" />, label: 'Skipped' },
};

const RUN_STATUS_CONFIG: Record<string, { color: string; badgeClass: string; dot: string; label: string }> = {
    pending: { color: 'text-dds-orange', badgeClass: 'badge badge-queued', dot: 'bg-dds-orange', label: 'Pending' },
    running: { color: 'text-dds-blue', badgeClass: 'badge badge-success bg-dds-blue/10 text-dds-blue border-dds-blue/30', dot: 'bg-dds-blue animate-pulse', label: 'Running' },
    success: { color: 'text-dds-green', badgeClass: 'badge badge-success', dot: 'bg-dds-green', label: 'Success' },
    failed: { color: 'text-dds-red', badgeClass: 'badge badge-failed', dot: 'bg-dds-red', label: 'Failed' },
};

function LiveDuration({ startedAt }: { startedAt: string | null }) {
    const [elapsed, setElapsed] = useState<number>(0);

    useEffect(() => {
        if (!startedAt) return;
        const start = new Date(startedAt).getTime();
        
        const update = () => setElapsed(Date.now() - start);
        update(); // initial
        
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startedAt]);

    return <span>{formatDuration(elapsed)}</span>;
}

// Step Timeline

function StepTimeline({ steps }: { steps: PipelineStep[] }) {
    return (
        <div className="space-y-[2px]">
            {steps.map((step, i) => {
                const config = STEP_STATUS_CONFIG[step.status] || STEP_STATUS_CONFIG.pending;
                return (
                    <motion.div
                        key={step.name}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${config.bg} ${config.border} transition-colors shadow-sm`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                    >
                        <div className="flex-shrink-0">{config.icon}</div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-medium capitalize ${config.color}`}>{step.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-dds-text-muted">
                                {step.startedAt && <span>STARTED: {formatTimestamp(step.startedAt)}</span>}
                                {step.completedAt && <span>COMPLETED: {formatTimestamp(step.completedAt)}</span>}
                            </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                            {step.duration ? (
                                <span className="text-[12px] font-mono text-dds-text-primary flex items-center gap-1.5">
                                    <Timer size={12} className="text-dds-text-muted" />
                                    {formatDuration(step.duration)}
                                </span>
                            ) : step.status === 'running' ? (
                                <span className="text-[12px] font-mono text-dds-blue flex items-center gap-1.5 font-medium">
                                    <Timer size={12} />
                                    <LiveDuration startedAt={step.startedAt!} />
                                </span>
                            ) : step.status === 'skipped' ? (
                                <span className="text-[12px] font-mono text-dds-text-muted italic">—</span>
                            ) : null}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

//  Log Viewer

function LogPanel({ runId, wsLogs, isActive, wsUnavailable }: { runId: string; wsLogs: string[]; isActive: boolean; wsUnavailable?: boolean }) {
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
        <div className="bg-dds-bg border border-dds-border rounded-xl overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-dds-border bg-dds-surface/80">
                <div className="flex items-center gap-2 text-[11px] font-mono text-dds-text-secondary uppercase tracking-wider">
                    <ScrollText size={14} className="text-dds-primary" />
                    <span>{allLogs.length} line{allLogs.length !== 1 ? 's' : ''}</span>
                    {isActive && (
                        <span className={`flex items-center gap-1.5 ml-3 font-medium ${wsUnavailable ? 'text-dds-orange' : 'text-dds-green'}`}>
                            <span className="relative flex h-2 w-2">
                                {!wsUnavailable && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dds-green opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${wsUnavailable ? 'bg-dds-orange' : 'bg-dds-green'}`}></span>
                            </span>
                            {wsUnavailable ? 'POLLING' : 'LIVE'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-mono font-medium transition-all border ${
                            autoScroll
                                ? 'text-dds-blue bg-dds-blue/10 border-dds-blue/30'
                                : 'text-dds-text-secondary bg-dds-bg border-dds-border hover:text-dds-white hover:bg-dds-surface'
                        }`}
                        title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
                    >
                        {autoScroll ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                        AUTO-SCROLL
                    </button>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-mono font-medium text-dds-text-secondary bg-dds-bg border border-dds-border hover:text-dds-white hover:bg-dds-surface transition-all"
                        title="Copy logs"
                    >
                        <Copy size={12} />
                        COPY
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-mono font-medium text-dds-text-secondary bg-dds-bg border border-dds-border hover:text-dds-white hover:bg-dds-surface transition-all"
                        title="Download logs"
                    >
                        <Download size={12} />
                        DL
                    </button>
                </div>
            </div>

            {/* Log content */}
            <div
                ref={containerRef}
                className="h-96 overflow-y-auto font-mono text-[12px] leading-relaxed p-4 bg-dds-bg"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
            >
                {loading && allLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-dds-text-muted">
                        <Loader2 size={14} className="animate-spin" />
                        Loading logs…
                    </div>
                ) : error ? (
                    <div className="text-dds-red flex items-center gap-2">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                ) : allLogs.length === 0 ? (
                    <p className="text-dds-text-muted">No logs available yet.</p>
                ) : (
                    allLogs.map((line: string, i: number) => (
                        <div
                            key={i}
                            className={`py-[1px] px-1.5 rounded hover:bg-dds-surface/50 transition-colors ${
                                line.includes('[step:') && line.includes('failed')
                                    ? 'text-dds-red'
                                    : line.includes('[step:') && line.includes('success')
                                        ? 'text-dds-green'
                                        : line.includes('[step:') && line.includes('started')
                                            ? 'text-dds-blue'
                                            : line.includes('ERROR') || line.includes('error')
                                                ? 'text-dds-red/80'
                                                : line.includes('WARNING') || line.includes('warn')
                                                    ? 'text-dds-orange'
                                                    : 'text-dds-text-secondary'
                            }`}
                        >
                            <span className="text-dds-text-muted select-none mr-3 w-8 inline-block text-right">{String(i + 1).padStart(3, ' ')}</span>
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
            <div className="min-h-screen flex flex-col bg-dds-bg">
                <main className="flex-1 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={32} className="animate-spin text-dds-primary" />
                    <p className="text-[13px] font-medium text-dds-text-muted tracking-wide">Loading run details...</p>
                </main>
            </div>
        );
    }

    if (error || !run) {
        return (
            <div className="min-h-screen flex flex-col bg-dds-bg">
                <main className="flex-1 flex flex-col items-center justify-center py-20 bg-dds-surface/50 m-8 rounded-xl border border-dds-border shadow-sm">
                    <div className="w-14 h-14 rounded-xl bg-dds-red/10 border border-dds-red/30 flex items-center justify-center mb-4">
                        <AlertCircle size={24} className="text-dds-red" />
                    </div>
                    <h3 className="text-dds-text-primary font-medium text-[15px] mb-2">Pipeline run not found</h3>
                    <p className="text-dds-text-secondary text-[13px] mb-6">The run may have been deleted or you don't have access.</p>
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

    const statusConfig = RUN_STATUS_CONFIG[run.status] || RUN_STATUS_CONFIG.pending;
    const shortHash = run.commitHash?.slice(0, 7);

    return (
        <div className="min-h-screen flex flex-col bg-dds-bg">
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {isActive && wsUnavailable && (
                        <motion.div
                            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-dds-orange/10 border border-dds-orange/30 text-dds-orange text-[13px] shadow-sm"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <WifiOff size={16} />
                            <span>Live updates unavailable — data refreshes every few seconds via polling.</span>
                        </motion.div>
                    )}

                    {/* Page Header  */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="text-dds-text-secondary hover:text-dds-white transition-colors p-1.5 rounded-lg hover:bg-dds-surface">
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-base font-semibold text-dds-text-primary">Pipeline Run</h1>
                                    <span className={statusConfig.badgeClass}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig.dot}`} />
                                        {statusConfig.label}
                                    </span>
                                </div>
                                <p className="text-[12px] text-dds-text-muted mt-1 font-mono">
                                    RUN ID: <code className="text-dds-text-secondary ml-1">{runId?.slice(-8)}</code>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Execution Summary */}
                    <div className="mb-8">
                        <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Activity size={14} className="text-dds-primary" /> Execution Summary
                        </h2>
                        <motion.div
                            className="bg-dds-surface border border-dds-border rounded-xl p-6 shadow-sm"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-6 gap-x-8">
                                {/* Status */}
                                <div>
                                    <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">Status</p>
                                    <span className={statusConfig.badgeClass}>
                                        {run.status === 'success' && <CheckCircle2 size={12} className="mr-1.5" />}
                                        {run.status === 'failed' && <XCircle size={12} className="mr-1.5" />}
                                        {run.status === 'running' && <Loader2 size={12} className="animate-spin mr-1.5" />}
                                        {run.status === 'pending' && <Clock size={12} className="mr-1.5" />}
                                        {statusConfig.label}
                                    </span>
                                </div>

                                {/* Duration */}
                                <div>
                                    <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Timer size={12} className="text-dds-primary" /> Duration
                                    </p>
                                    <p className="text-[14px] font-semibold text-dds-text-primary">
                                        {run.status === 'running' ? (
                                            <span className="text-dds-blue font-mono">
                                                <LiveDuration startedAt={run.startedAt} />
                                            </span>
                                        ) : (
                                            <span className="font-mono">{formatDuration(run.duration)}</span>
                                        )}
                                    </p>
                                </div>

                                {/* Commit */}
                                {shortHash && (
                                    <div>
                                        <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <GitCommitHorizontal size={12} className="text-dds-primary" /> Commit
                                        </p>
                                        <div>
                                            <code className="text-[12px] font-mono text-dds-blue bg-dds-blue/10 border border-dds-blue/20 px-1.5 py-0.5 rounded">{shortHash}</code>
                                            {run.commitMessage && (
                                                <p className="text-[12px] text-dds-text-muted mt-1.5 truncate max-w-[12rem]">{run.commitMessage}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Trigger */}
                                <div>
                                    <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Zap size={12} className="text-dds-primary" /> Triggered by
                                    </p>
                                    <p className="text-[13px] font-semibold text-dds-text-primary capitalize">{run.triggerSource}</p>
                                </div>

                                {/* Branch */}
                                {run.branch && (
                                    <div>
                                        <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <GitBranch size={12} className="text-dds-primary" /> Branch
                                        </p>
                                        <p className="text-[13px] font-semibold text-dds-text-primary">{run.branch}</p>
                                    </div>
                                )}

                                {/* Started */}
                                <div>
                                    <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Clock size={12} className="text-dds-primary" /> Started
                                    </p>
                                    <p className="text-[13px] font-medium text-dds-text-primary">{formatTimestamp(run.startedAt)}</p>
                                </div>

                                {/* Completed */}
                                <div>
                                    <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <CheckCircle2 size={12} className="text-dds-primary" /> Completed
                                    </p>
                                    <p className="text-[13px] font-medium text-dds-text-primary">{formatTimestamp(run.completedAt)}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Step Timeline  */}
                    <div className="mb-8">
                        <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                            <SkipForward size={14} className="text-dds-primary" /> Step Timeline
                        </h2>
                        {run.steps && run.steps.length > 0 ? (
                            <StepTimeline steps={run.steps} />
                        ) : (
                            <div className="bg-dds-surface border border-dds-border rounded-xl p-8 text-center shadow-sm">
                                <p className="text-dds-text-muted text-[13px]">No step data available</p>
                            </div>
                        )}
                    </div>

                    {/*  Artifacts   */}
                    {(run.buildId || run.deploymentId) && (
                        <div className="mb-8">
                            <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Hammer size={14} className="text-dds-primary" /> Artifacts
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {run.buildId && (
                                    <button
                                        onClick={() => navigate(`/builds/${run.buildId}`)}
                                        className="flex items-center gap-4 px-5 py-4 bg-dds-surface border border-dds-border rounded-xl hover:bg-dds-bg hover:border-dds-primary/30 transition-all text-left group shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-dds-blue/10 flex items-center justify-center flex-shrink-0 border border-dds-blue/20">
                                            <Hammer size={18} className="text-dds-blue" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-medium text-dds-text-primary group-hover:text-dds-white transition-colors">Build</p>
                                            <p className="text-[12px] text-dds-text-secondary mt-0.5">View build details and logs</p>
                                        </div>
                                        <ExternalLink size={16} className="text-dds-text-muted group-hover:text-dds-primary transition-colors" />
                                    </button>
                                )}
                                {run.deploymentId && (
                                    <button
                                        onClick={() => navigate(`/deployments`)}
                                        className="flex items-center gap-4 px-5 py-4 bg-dds-surface border border-dds-border rounded-xl hover:bg-dds-bg hover:border-dds-primary/30 transition-all text-left group shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-dds-green/10 flex items-center justify-center flex-shrink-0 border border-dds-green/20">
                                            <Rocket size={18} className="text-dds-green" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-medium text-dds-text-primary group-hover:text-dds-white transition-colors">Deployment</p>
                                            <p className="text-[12px] text-dds-text-secondary mt-0.5">View deployment status</p>
                                        </div>
                                        <ExternalLink size={16} className="text-dds-text-muted group-hover:text-dds-primary transition-colors" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/*  Error Message  */}
                    {run.error && (
                        <div className="mb-8">
                            <div className="flex items-start gap-3 px-5 py-4 bg-dds-red/10 border border-dds-red/30 rounded-xl shadow-sm">
                                <AlertCircle size={18} className="text-dds-red mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[14px] font-medium text-dds-red">Pipeline Error</p>
                                    <p className="text-[13px] text-dds-red/80 mt-1">{run.error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/*  Logs  */}
                    <div className="mb-8">
                        <LogPanel runId={runId!} wsLogs={wsLogs} isActive={!!isActive} wsUnavailable={wsUnavailable} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PipelineRunDetailPage;
