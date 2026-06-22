import React, { useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    XCircle,
    Timer,
    Loader2,
    HardDrive,
    Layers,
    Wifi,
    WifiOff,
    Terminal,
    AlertTriangle,
} from 'lucide-react';
import { useBuild } from '../hooks/useBuilds';
import { useBuildSocket } from '../hooks/useBuildSocket';
import BuildFailurePanel from '../components/BuildFailurePanel';

const STATUS_CONFIG: Record<string, { badgeClass: string; icon: React.ReactNode; label: string }> = {
    pending: { badgeClass: 'badge badge-queued', icon: <Clock size={14} />, label: 'Pending' },
    running: { badgeClass: 'badge badge-success bg-dds-blue/10 text-dds-blue border-dds-blue/30', icon: <Loader2 size={14} className="animate-spin" />, label: 'Building…' },
    success: { badgeClass: 'badge badge-success', icon: <CheckCircle2 size={14} />, label: 'Success' },
    failed: { badgeClass: 'badge badge-failed', icon: <XCircle size={14} />, label: 'Failed' },
    timeout: { badgeClass: 'badge badge-warning', icon: <Timer size={14} />, label: 'Timeout' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span className={config.badgeClass}>
            <span className="mr-1.5">{config.icon}</span>
            {config.label}
        </span>
    );
}

function formatDuration(start?: string, end?: string): string {
    if (!start) return '—';
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const seconds = Math.round((e - s) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function formatSize(bytes?: number): string {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

const BuildDetailPage: React.FC = () => {
    const { buildId } = useParams<{ buildId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: build, isLoading, error } = useBuild(buildId || '');
    const logEndRef = useRef<HTMLDivElement>(null);

    const isActive = build?.status === 'pending' || build?.status === 'running';

    const { logs: wsLogs, isConnected, isReconnecting, finalStatus } = useBuildSocket({
        buildId: buildId || '',
        enabled: isActive,
    });

    // When the WebSocket signals build_complete, refetch the build data
    // so imageSizeBytes, layerCount, and logSummary are loaded from the DB
    useEffect(() => {
        if (finalStatus && buildId) {
            // Small delay to ensure DB write completes before we refetch
            const timer = setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['build', buildId] });
                queryClient.invalidateQueries({ queryKey: ['builds'] });
                // A completed build produces a new image
                queryClient.invalidateQueries({ queryKey: ['images'] });
                queryClient.invalidateQueries({ queryKey: ['images-usage-summary'] });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [finalStatus, buildId, queryClient]);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [wsLogs]);

    // Combine persisted logSummary (for completed builds) with live WS logs
    const displayLogs = React.useMemo(() => {
        if (wsLogs.length > 0) return wsLogs;
        if (build?.logSummary) return build.logSummary.split('\n');
        return [];
    }, [wsLogs, build?.logSummary]);

    const displayStatus = finalStatus || build?.status || 'pending';

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dds-bg flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-dds-primary" />
            </div>
        );
    }

    if (error || !build) {
        return (
            <div className="min-h-screen bg-dds-bg flex items-center justify-center">
                <div className="bg-dds-surface border border-dds-red/30 rounded-2xl p-8 max-w-md text-center shadow-sm">
                    <XCircle size={48} className="mx-auto text-dds-red mb-4" />
                    <h2 className="text-xl font-bold text-dds-text-primary mb-2">Build Not Found</h2>
                    <p className="text-dds-text-secondary mb-6">The build could not be loaded.</p>
                    <button onClick={() => navigate('/builds')} className="btn-primary inline-flex">
                        <ArrowLeft size={16} className="mr-1.5" /> Back to Builds
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-dds-bg">
            {/* Top bar */}
            <header className="bg-dds-surface/80 backdrop-blur-xl border-b border-dds-border sticky top-0 z-50 h-14">
                <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/builds')} className="text-dds-text-secondary hover:text-dds-white transition-colors p-1.5 rounded-lg hover:bg-dds-surface">
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="font-semibold text-dds-text-primary text-[15px] truncate">Build: <span className="font-mono text-dds-text-secondary">{build.tag}</span></h1>
                    </div>
                    <StatusBadge status={displayStatus} />
                </div>
            </header>

            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Completion banner */}
                    <AnimatePresence>
                        {finalStatus && (
                            <motion.div
                                initial={{ opacity: 0, y: -12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`rounded-xl border p-4 flex items-center gap-3 shadow-sm ${finalStatus === 'success'
                                    ? 'bg-dds-green/10 border-dds-green/30'
                                    : finalStatus === 'timeout'
                                        ? 'bg-dds-orange/10 border-dds-orange/30'
                                        : 'bg-dds-red/10 border-dds-red/30'
                                    }`}
                            >
                                {finalStatus === 'success' ? (
                                    <CheckCircle2 size={20} className="text-dds-green" />
                                ) : finalStatus === 'timeout' ? (
                                    <Timer size={20} className="text-dds-orange" />
                                ) : (
                                    <XCircle size={20} className="text-dds-red" />
                                )}
                                <span className={`text-[13px] font-medium ${finalStatus === 'success' ? 'text-dds-green' : finalStatus === 'timeout' ? 'text-dds-orange' : 'text-dds-red'
                                    }`}>
                                    {finalStatus === 'success' ? 'Build completed successfully!' :
                                        finalStatus === 'timeout' ? 'Build timed out after 15 minutes' :
                                            'Build failed'}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Info cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-dds-text-secondary text-[12px] mb-1.5">
                                <Clock size={14} className="text-dds-text-muted" /> Duration
                            </div>
                            <p className="text-dds-text-primary font-semibold text-[15px] font-mono">
                                {formatDuration(build.startedAt, build.completedAt)}
                            </p>
                        </div>
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-dds-text-secondary text-[12px] mb-1.5">
                                <HardDrive size={14} className="text-dds-text-muted" /> Image Size
                            </div>
                            <p className="text-dds-text-primary font-semibold text-[15px] font-mono">
                                {formatSize(build.imageSizeBytes)}
                            </p>
                        </div>
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-dds-text-secondary text-[12px] mb-1.5">
                                <Layers size={14} className="text-dds-text-muted" /> Layers
                            </div>
                            <p className="text-dds-text-primary font-semibold text-[15px] font-mono">
                                {build.layerCount || '—'}
                            </p>
                        </div>
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-dds-text-secondary text-[12px] mb-1.5">
                                <Terminal size={14} className="text-dds-text-muted" /> Created
                            </div>
                            <p className="text-dds-text-primary font-semibold text-[15px] truncate font-mono">
                                {new Date(build.createdAt).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Error display */}
                    {build.error && (
                        <div className="bg-dds-red/10 border border-dds-red/30 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                            <AlertTriangle size={18} className="text-dds-red mt-0.5 shrink-0" />
                            <div>
                                <p className="text-dds-red text-[14px] font-medium mb-1">Build Error</p>
                                <p className="text-dds-red/80 text-[13px] font-mono leading-relaxed">{build.error}</p>
                            </div>
                        </div>
                    )}

                    {/* Failure Intelligence */}
                    {(displayStatus === 'failed' || displayStatus === 'timeout') && build.failureAnalysis && (
                        <BuildFailurePanel analysis={build.failureAnalysis} />
                    )}

                    {/* Build logs */}
                    <div className="bg-dds-bg border border-dds-border rounded-xl overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-dds-border bg-dds-surface/80">
                            <div className="flex items-center gap-3">
                                <Terminal size={14} className="text-dds-primary" />
                                <h2 className="text-[13px] font-medium text-dds-text-primary">Build Output</h2>
                                <span className="text-[12px] text-dds-text-muted font-mono">{displayLogs.length} lines</span>
                            </div>

                            {isActive && (
                                <div className="flex items-center gap-2 text-[11px] font-mono font-medium tracking-wider">
                                    {isReconnecting ? (
                                        <span className="flex items-center gap-1.5 text-dds-orange">
                                            <WifiOff size={12} /> RECONNECTING
                                        </span>
                                    ) : isConnected ? (
                                        <span className="flex items-center gap-1.5 text-dds-green">
                                            <Wifi size={12} /> LIVE
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-dds-text-muted">
                                            <WifiOff size={12} /> CONNECTING
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-2 max-h-[600px] overflow-y-auto font-mono text-[12px] leading-relaxed bg-dds-bg">
                            {displayLogs.length === 0 ? (
                                <div className="flex items-center justify-center py-16 text-dds-text-muted">
                                    {isActive ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 size={14} className="animate-spin text-dds-blue" />
                                            Waiting for build output…
                                        </span>
                                    ) : (
                                        'No log output available'
                                    )}
                                </div>
                            ) : (
                                displayLogs.map((line, i) => {
                                    const isError = /error|ERROR|fatal|FATAL|panic|PANIC/i.test(line);
                                    const isWarning = /warn|WARNING/i.test(line);
                                    return (
                                        <div
                                            key={i}
                                            className={`flex gap-3 px-3 py-[2px] hover:bg-dds-surface/50 rounded transition-colors ${isError ? 'bg-dds-red/10 text-dds-red' :
                                                isWarning ? 'text-dds-orange' :
                                                    'text-dds-text-secondary'
                                                }`}
                                        >
                                            <span className="text-dds-text-muted select-none w-8 text-right shrink-0">{i + 1}</span>
                                            <span className="break-all whitespace-pre-wrap">{line}</span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BuildDetailPage;
