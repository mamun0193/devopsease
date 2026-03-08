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

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    PENDING: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <Clock size={16} />, label: 'Pending' },
    RUNNING: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <Loader2 size={16} className="animate-spin" />, label: 'Building…' },
    SUCCESS: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <CheckCircle2 size={16} />, label: 'Success' },
    FAILED: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <XCircle size={16} />, label: 'Failed' },
    TIMEOUT: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <Timer size={16} />, label: 'Timeout' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium ${config.color} ${config.bg} border ${config.border}`}>
            {config.icon}
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

    const isActive = build?.status === 'PENDING' || build?.status === 'RUNNING';

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

    const displayStatus = finalStatus || build?.status || 'PENDING';

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-slate-500" />
            </div>
        );
    }

    if (error || !build) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
                    <XCircle size={48} className="mx-auto text-red-400 mb-4" />
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Build Not Found</h2>
                    <p className="text-slate-400 mb-4">The build could not be loaded.</p>
                    <button onClick={() => navigate('/builds')} className="text-blue-400 hover:text-blue-300 text-sm">
                        ← Back to Builds
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            {/* Top bar */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50 h-14">
                <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/builds')} className="text-slate-400 hover:text-slate-200 transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="font-semibold text-slate-100 text-sm truncate">Build: {build.tag}</h1>
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
                                className={`rounded-xl border p-4 flex items-center gap-3 ${finalStatus === 'SUCCESS'
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : finalStatus === 'TIMEOUT'
                                        ? 'bg-orange-500/10 border-orange-500/30'
                                        : 'bg-red-500/10 border-red-500/30'
                                    }`}
                            >
                                {finalStatus === 'SUCCESS' ? (
                                    <CheckCircle2 size={20} className="text-emerald-400" />
                                ) : finalStatus === 'TIMEOUT' ? (
                                    <Timer size={20} className="text-orange-400" />
                                ) : (
                                    <XCircle size={20} className="text-red-400" />
                                )}
                                <span className={`text-sm font-medium ${finalStatus === 'SUCCESS' ? 'text-emerald-400' : finalStatus === 'TIMEOUT' ? 'text-orange-400' : 'text-red-400'
                                    }`}>
                                    {finalStatus === 'SUCCESS' ? 'Build completed successfully!' :
                                        finalStatus === 'TIMEOUT' ? 'Build timed out after 15 minutes' :
                                            'Build failed'}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Info cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                                <Clock size={12} /> Duration
                            </div>
                            <p className="text-slate-100 font-semibold text-sm">
                                {formatDuration(build.startedAt, build.completedAt)}
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                                <HardDrive size={12} /> Image Size
                            </div>
                            <p className="text-slate-100 font-semibold text-sm">
                                {formatSize(build.imageSizeBytes)}
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                                <Layers size={12} /> Layers
                            </div>
                            <p className="text-slate-100 font-semibold text-sm">
                                {build.layerCount || '—'}
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                                <Terminal size={12} /> Created
                            </div>
                            <p className="text-slate-100 font-semibold text-sm truncate">
                                {new Date(build.createdAt).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Error display */}
                    {build.error && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-red-400 text-sm font-medium mb-1">Build Error</p>
                                <p className="text-red-300/70 text-sm font-mono">{build.error}</p>
                            </div>
                        </div>
                    )}

                    {/* Failure Intelligence */}
                    {(displayStatus === 'FAILED' || displayStatus === 'TIMEOUT') && build.failureAnalysis && (
                        <BuildFailurePanel analysis={build.failureAnalysis} />
                    )}

                    {/* Build logs */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-slate-400" />
                                <h2 className="text-sm font-medium text-slate-300">Build Output</h2>
                                <span className="text-xs text-slate-600">{displayLogs.length} lines</span>
                            </div>

                            {isActive && (
                                <div className="flex items-center gap-2 text-xs">
                                    {isReconnecting ? (
                                        <span className="flex items-center gap-1.5 text-yellow-400">
                                            <WifiOff size={12} /> Reconnecting…
                                        </span>
                                    ) : isConnected ? (
                                        <span className="flex items-center gap-1.5 text-emerald-400">
                                            <Wifi size={12} /> Live
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-slate-500">
                                            <WifiOff size={12} /> Connecting…
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-1 max-h-[600px] overflow-y-auto font-mono text-xs bg-slate-950/50">
                            {displayLogs.length === 0 ? (
                                <div className="flex items-center justify-center py-16 text-slate-600">
                                    {isActive ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 size={14} className="animate-spin" />
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
                                            className={`flex gap-3 px-4 py-0.5 hover:bg-slate-800/30 ${isError ? 'bg-red-500/5 text-red-300' :
                                                isWarning ? 'text-yellow-300/80' :
                                                    'text-slate-400'
                                                }`}
                                        >
                                            <span className="text-slate-600 select-none w-8 text-right shrink-0">{i + 1}</span>
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
