import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Box,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Loader2,
    RefreshCcw,
    Terminal,
    ChevronDown,
    X,
    Server,
    Activity,
    RotateCcw,
    Layers,
    Filter,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import {
    useClusters,
    useClusterPods,
    useClusterNamespaces,
    usePodLogs,
} from '../hooks/useClusters';
import type { K8sPod, K8sCluster } from '../api';

// Status helpers 

const STATUS_CONFIG: Record<string, { color: string; bg: string; ring: string; icon: React.ElementType; dot: string }> = {
    Running:    { color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20', icon: CheckCircle2, dot: 'bg-emerald-400' },
    Succeeded:  { color: 'text-blue-400',    bg: 'bg-blue-500/10',    ring: 'ring-blue-500/20',    icon: CheckCircle2, dot: 'bg-blue-400' },
    Pending:    { color: 'text-amber-400',   bg: 'bg-amber-500/10',   ring: 'ring-amber-500/20',   icon: Clock,        dot: 'bg-amber-400' },
    Failed:     { color: 'text-red-400',     bg: 'bg-red-500/10',     ring: 'ring-red-500/20',     icon: XCircle,      dot: 'bg-red-400' },
    Unknown:    { color: 'text-slate-400',   bg: 'bg-slate-500/10',   ring: 'ring-slate-500/20',   icon: AlertTriangle, dot: 'bg-slate-400' },
};

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.Unknown;
}

function formatAge(timestamp: string | null): string {
    if (!timestamp) return '—';
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

// Summary Card 

function SummaryCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
}) {
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

// Cluster Selector 

function ClusterSelector({
    clusters,
    selectedId,
    onSelect,
}: {
    clusters: K8sCluster[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = clusters.find(c => c._id === selectedId);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-200 hover:border-slate-600 transition-colors min-w-[200px]"
            >
                <Server size={14} className="text-slate-400 flex-shrink-0" />
                <span className="truncate flex-1 text-left">
                    {selected?.name || 'Select cluster'}
                </span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
                    >
                        {clusters.filter(c => c.status === 'connected').map(cluster => (
                            <button
                                key={cluster._id}
                                onClick={() => { onSelect(cluster._id); setOpen(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-700/50 transition-colors ${
                                    cluster._id === selectedId ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                <span className="truncate">{cluster.name}</span>
                            </button>
                        ))}
                        {clusters.filter(c => c.status === 'connected').length === 0 && (
                            <p className="px-3 py-4 text-xs text-slate-500 text-center">
                                No connected clusters
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Namespace Selector

function NamespaceSelector({
    namespaces,
    selected,
    onSelect,
    isLoading,
}: {
    namespaces: Array<{ name: string }>;
    selected: string;
    onSelect: (ns: string) => void;
    isLoading: boolean;
}) {
    return (
        <div className="relative">
            <select
                value={selected}
                onChange={(e) => onSelect(e.target.value)}
                disabled={isLoading}
                className="appearance-none px-3 py-2 pr-8 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-200 hover:border-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            >
                {namespaces.map((ns) => (
                    <option key={ns.name} value={ns.name}>
                        {ns.name}
                    </option>
                ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
    );
}

/* ── Pod Row ──────────────────────────────────────────────────────────────── */

function PodRow({
    pod,
    isSelected,
    onClick,
}: {
    pod: K8sPod;
    isSelected: boolean;
    onClick: () => void;
}) {
    const config = getStatusConfig(pod.status);
    const StatusIcon = config.icon;

    return (
        <motion.button
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onClick={onClick}
            className={`w-full text-left bg-slate-800/40 border rounded-xl p-4 transition-all ${
                isSelected
                    ? 'border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/20'
                    : 'border-slate-700/40 hover:border-slate-600/60'
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                {/* Left: Name + Node */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                        <StatusIcon size={15} className={config.color} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">{pod.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                            {pod.nodeName || 'Unscheduled'}
                        </p>
                    </div>
                </div>

                {/* Right: Status + Restarts + Age */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Restarts badge */}
                    {pod.restarts > 0 && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                            pod.restarts >= 5
                                ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
                        }`}>
                            <RotateCcw size={10} />
                            {pod.restarts}
                        </span>
                    )}

                    {/* Age */}
                    <span className="text-xs text-slate-500 tabular-nums w-10 text-right">
                        {formatAge(pod.age)}
                    </span>

                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color} ring-1 ${config.ring}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {pod.status}
                    </span>

                    {/* Logs icon */}
                    <Terminal size={14} className={`flex-shrink-0 transition-colors ${
                        isSelected ? 'text-blue-400' : 'text-slate-600'
                    }`} />
                </div>
            </div>

            {/* Containers detail */}
            {pod.containers.length > 1 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {pod.containers.map((c) => (
                        <span
                            key={c.name}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md border ${
                                c.ready
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/5 border-red-500/20 text-red-400'
                            }`}
                        >
                            <Layers size={9} />
                            {c.name}
                        </span>
                    ))}
                </div>
            )}
        </motion.button>
    );
}

// Logs Viewer 

function LogsViewer({
    clusterId,
    pod,
    namespace,
    onClose,
}: {
    clusterId: string;
    pod: K8sPod;
    namespace: string;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const [tailLines, setTailLines] = useState(100);
    const [selectedContainer, setSelectedContainer] = useState<string | undefined>(
        pod.containers.length > 1 ? pod.containers[0]?.name : undefined,
    );

    const { data: logs, isLoading, isFetching, error } = usePodLogs(
        clusterId,
        pod.name,
        { namespace, tailLines, container: selectedContainer },
    );

    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries({
            queryKey: ['pod-logs', clusterId, pod.name],
        });
    }, [queryClient, clusterId, pod.name]);

    const logLines = useMemo(() => {
        if (!logs) return [];
        return logs.split('\n').filter(Boolean);
    }, [logs]);

    const config = getStatusConfig(pod.status);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col bg-slate-900/80 border border-slate-700/40 rounded-xl overflow-hidden h-full"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40 bg-slate-800/30">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Terminal size={15} className="text-blue-400 flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">{pod.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] ${config.color}`}>
                                <span className={`w-1 h-1 rounded-full ${config.dot}`} />
                                {pod.status}
                            </span>
                            {pod.nodeName && (
                                <span className="text-[11px] text-slate-600">
                                    · {pod.nodeName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Container selector for multi-container pods */}
                    {pod.containers.length > 1 && (
                        <select
                            value={selectedContainer || ''}
                            onChange={(e) => setSelectedContainer(e.target.value || undefined)}
                            className="px-2 py-1 bg-slate-800/60 border border-slate-700/60 rounded-md text-xs text-slate-300 cursor-pointer"
                        >
                            {pod.containers.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Tail lines selector */}
                    <select
                        value={tailLines}
                        onChange={(e) => setTailLines(Number(e.target.value))}
                        className="px-2 py-1 bg-slate-800/60 border border-slate-700/60 rounded-md text-xs text-slate-300 cursor-pointer"
                    >
                        <option value={50}>50 lines</option>
                        <option value={100}>100 lines</option>
                        <option value={500}>500 lines</option>
                        <option value={1000}>1000 lines</option>
                    </select>

                    {/* Refresh */}
                    <button
                        onClick={handleRefresh}
                        disabled={isFetching}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                        title="Refresh logs"
                    >
                        <RefreshCcw size={14} className={isFetching ? 'animate-spin' : ''} />
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Log Output */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={20} className="animate-spin text-slate-500" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <XCircle size={24} className="text-red-400 mb-2" />
                        <p className="text-sm text-red-400">
                            {(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to fetch logs'}
                        </p>
                    </div>
                ) : logLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Terminal size={24} className="text-slate-700 mb-2" />
                        <p className="text-sm text-slate-500">No logs available</p>
                        <p className="text-xs text-slate-600 mt-1">
                            This pod hasn't emitted any logs yet.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {logLines.map((line, i) => (
                            <div
                                key={i}
                                className="group flex hover:bg-slate-800/40 rounded px-1 -mx-1"
                            >
                                <span className="select-none text-slate-700 w-10 text-right pr-3 flex-shrink-0 tabular-nums">
                                    {i + 1}
                                </span>
                                <span className={`flex-1 break-all whitespace-pre-wrap ${
                                    line.toLowerCase().includes('error') || line.toLowerCase().includes('fatal')
                                        ? 'text-red-400/90'
                                        : line.toLowerCase().includes('warn')
                                        ? 'text-amber-400/80'
                                        : 'text-slate-300'
                                }`}>
                                    {line}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// Page 

const PodsPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const { data: clusters = [], isLoading: loadingClusters } = useClusters();
    const connectedClusters = useMemo(
        () => clusters.filter(c => c.status === 'connected'),
        [clusters],
    );

    // Cluster selection — default to first connected
    const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
    const activeClusterId = selectedClusterId || connectedClusters[0]?._id || null;

    // Namespace
    const { data: namespaces = [], isLoading: loadingNs } = useClusterNamespaces(activeClusterId);
    const [namespace, setNamespace] = useState(searchParams.get('namespace') || 'default');

    // Pods
    const { data: pods = [], isLoading: loadingPods, isFetching: fetchingPods } = useClusterPods(activeClusterId, namespace);

    // Status filter
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Selected pod for logs
    const [selectedPod, setSelectedPod] = useState<K8sPod | null>(null);

    // Computed
    const summary = useMemo(() => ({
        total: pods.length,
        running: pods.filter(p => p.status === 'Running').length,
        pending: pods.filter(p => p.status === 'Pending').length,
        failed: pods.filter(p => p.status === 'Failed').length,
        succeeded: pods.filter(p => p.status === 'Succeeded').length,
    }), [pods]);

    const filteredPods = useMemo(() => {
        if (statusFilter === 'all') return pods;
        return pods.filter(p => p.status.toLowerCase() === statusFilter.toLowerCase());
    }, [pods, statusFilter]);

    const handleClusterChange = useCallback((id: string) => {
        setSelectedClusterId(id);
        setSelectedPod(null);
        setNamespace('default');
    }, []);

    const handleNamespaceChange = useCallback((ns: string) => {
        setNamespace(ns);
        setSelectedPod(null);
        setSearchParams({ namespace: ns });
    }, [setSearchParams]);

    const handleRefreshPods = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['cluster-pods', activeClusterId, namespace] });
    }, [queryClient, activeClusterId, namespace]);

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header />
            <ResourceNav />

            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">

                    {/* Page header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/clusters')}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-2xl font-bold text-slate-100">Pod Observability</h1>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Cluster picker */}
                            <ClusterSelector
                                clusters={connectedClusters}
                                selectedId={activeClusterId}
                                onSelect={handleClusterChange}
                            />

                            {/* Namespace picker */}
                            {activeClusterId && namespaces.length > 0 && (
                                <NamespaceSelector
                                    namespaces={namespaces}
                                    selected={namespace}
                                    onSelect={handleNamespaceChange}
                                    isLoading={loadingNs}
                                />
                            )}

                            {/* Refresh */}
                            <button
                                onClick={handleRefreshPods}
                                disabled={fetchingPods || !activeClusterId}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-xs text-slate-300 hover:border-slate-600 transition-colors disabled:opacity-40"
                            >
                                <RefreshCcw size={12} className={fetchingPods ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* No cluster guard */}
                    {!loadingClusters && connectedClusters.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-24 text-center"
                        >
                            <Server size={40} className="text-slate-700 mb-4" />
                            <p className="text-sm text-slate-400 mb-1">No connected clusters</p>
                            <p className="text-xs text-slate-600">
                                Connect a Kubernetes cluster first to view pods.
                            </p>
                            <button
                                onClick={() => navigate('/clusters')}
                                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Go to Clusters
                            </button>
                        </motion.div>
                    ) : loadingPods ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-slate-500" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                                <SummaryCard icon={Box} label="Total Pods" value={summary.total} color="bg-blue-600/20" />
                                <SummaryCard icon={CheckCircle2} label="Running" value={summary.running} color="bg-emerald-600/20" />
                                <SummaryCard icon={Clock} label="Pending" value={summary.pending} color="bg-amber-600/20" />
                                <SummaryCard icon={XCircle} label="Failed" value={summary.failed} color="bg-red-600/20" />
                                <SummaryCard icon={Activity} label="Succeeded" value={summary.succeeded} color="bg-blue-600/20" />
                            </div>

                            {/* Status filter pills */}
                            <div className="flex items-center gap-2 mb-4">
                                <Filter size={13} className="text-slate-500" />
                                {['all', 'Running', 'Pending', 'Failed', 'Succeeded'].map((f) => {
                                    const isActive = statusFilter === f.toLowerCase() || (f === 'all' && statusFilter === 'all');
                                    const filterKey = f === 'all' ? 'all' : f;
                                    return (
                                        <button
                                            key={f}
                                            onClick={() => setStatusFilter(filterKey === 'all' ? 'all' : filterKey)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                                                isActive
                                                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                                                    : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600'
                                            }`}
                                        >
                                            {f === 'all' ? 'All' : f}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Main content: Pod list + Logs viewer */}
                            <div className={`grid gap-4 ${selectedPod ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                                {/* Pod list */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Box size={14} className="text-slate-500" />
                                        <h2 className="text-sm font-semibold text-slate-300">
                                            Pods
                                            <span className="ml-1.5 text-slate-600">
                                                ({filteredPods.length})
                                            </span>
                                        </h2>
                                        {fetchingPods && (
                                            <Loader2 size={12} className="animate-spin text-slate-600" />
                                        )}
                                    </div>

                                    {filteredPods.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex flex-col items-center justify-center py-16 text-center"
                                        >
                                            <Box size={32} className="text-slate-700 mb-3" />
                                            <p className="text-sm text-slate-500">
                                                {statusFilter === 'all'
                                                    ? `No pods found in "${namespace}"`
                                                    : `No ${statusFilter} pods in "${namespace}"`}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-1 scrollbar-thin">
                                            <AnimatePresence mode="popLayout">
                                                {filteredPods.map(pod => (
                                                    <PodRow
                                                        key={pod.name}
                                                        pod={pod}
                                                        isSelected={selectedPod?.name === pod.name}
                                                        onClick={() =>
                                                            setSelectedPod(
                                                                selectedPod?.name === pod.name ? null : pod,
                                                            )
                                                        }
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>

                                {/* Logs viewer */}
                                <AnimatePresence>
                                    {selectedPod && activeClusterId && (
                                        <div className="h-[calc(100vh-360px)]">
                                            <LogsViewer
                                                key={selectedPod.name}
                                                clusterId={activeClusterId}
                                                pod={selectedPod}
                                                namespace={namespace}
                                                onClose={() => setSelectedPod(null)}
                                            />
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PodsPage;
