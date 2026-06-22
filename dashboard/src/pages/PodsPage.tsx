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
import {
    useClusters,
    useClusterPods,
    useClusterNamespaces,
    usePodLogs,
} from '../hooks/useClusters';
import type { K8sPod, K8sCluster } from '../api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; ring: string; icon: React.ElementType; dot: string }> = {
    Running:    { color: 'text-dds-green', bg: 'bg-dds-green/10', ring: 'ring-dds-green/20', icon: CheckCircle2, dot: 'bg-dds-green' },
    Succeeded:  { color: 'text-dds-blue',    bg: 'bg-dds-blue/10',    ring: 'ring-dds-blue/20',    icon: CheckCircle2, dot: 'bg-dds-blue' },
    Pending:    { color: 'text-dds-yellow',   bg: 'bg-dds-yellow/10',   ring: 'ring-dds-yellow/20',   icon: Clock,        dot: 'bg-dds-yellow' },
    Failed:     { color: 'text-dds-red',     bg: 'bg-dds-red/10',     ring: 'ring-dds-red/20',     icon: XCircle,      dot: 'bg-dds-red' },
    Unknown:    { color: 'text-dds-text-muted',   bg: 'bg-dds-muted/50',   ring: 'ring-dds-border',   icon: AlertTriangle, dot: 'bg-dds-text-muted' },
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

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
    return (
        <div className="card p-4">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center border border-white/5`}>
                    <Icon size={16} className="text-white" />
                </div>
                <div>
                    <p className="text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">{label}</p>
                    <p className="text-xl font-bold text-dds-text-primary">{value}</p>
                </div>
            </div>
        </div>
    );
}

function ClusterSelector({ clusters, selectedId, onSelect }: { clusters: K8sCluster[]; selectedId: string | null; onSelect: (id: string) => void; }) {
    const [open, setOpen] = useState(false);
    const selected = clusters.find(c => c._id === selectedId);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 bg-dds-surface border border-dds-border rounded-md text-[13px] text-dds-text-primary hover:border-dds-blue/50 transition-colors min-w-[200px]"
            >
                <Server size={14} className="text-dds-text-muted flex-shrink-0" />
                <span className="truncate flex-1 text-left">
                    {selected?.name || 'Select cluster'}
                </span>
                <ChevronDown size={14} className={`text-dds-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 top-full mt-1 left-0 right-0 bg-dds-elevated border border-dds-border rounded-md shadow-xl overflow-hidden"
                    >
                        {clusters.filter(c => c.status === 'connected').map(cluster => (
                            <button
                                key={cluster._id}
                                onClick={() => { onSelect(cluster._id); setOpen(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-dds-muted transition-colors ${
                                    cluster._id === selectedId ? 'bg-dds-blue/10 text-dds-blue' : 'text-dds-text-secondary'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-dds-green flex-shrink-0" />
                                <span className="truncate">{cluster.name}</span>
                            </button>
                        ))}
                        {clusters.filter(c => c.status === 'connected').length === 0 && (
                            <p className="px-3 py-4 text-[12px] text-dds-text-muted text-center">
                                No connected clusters
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function NamespaceSelector({ namespaces, selected, onSelect, isLoading }: { namespaces: Array<{ name: string }>; selected: string; onSelect: (ns: string) => void; isLoading: boolean; }) {
    return (
        <div className="relative">
            <select
                value={selected}
                onChange={(e) => onSelect(e.target.value)}
                disabled={isLoading}
                className="appearance-none px-3 py-2 pr-8 bg-dds-surface border border-dds-border rounded-md text-[13px] text-dds-text-primary hover:border-dds-blue/50 transition-colors cursor-pointer disabled:opacity-50"
            >
                {namespaces.map((ns) => (
                    <option key={ns.name} value={ns.name}>
                        {ns.name}
                    </option>
                ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dds-text-muted pointer-events-none" />
        </div>
    );
}

function PodRow({ pod, isSelected, onClick }: { pod: K8sPod; isSelected: boolean; onClick: () => void; }) {
    const config = getStatusConfig(pod.status);
    const StatusIcon = config.icon;

    return (
        <motion.button
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onClick={onClick}
            className={`w-full text-left bg-dds-bg border rounded-md p-4 transition-all ${
                isSelected
                    ? 'border-dds-blue bg-dds-blue/5 ring-1 ring-dds-blue/20'
                    : 'border-dds-border hover:border-dds-text-muted'
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                        <StatusIcon size={15} className={config.color} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-dds-text-primary truncate">{pod.name}</p>
                        <p className="text-[11px] font-mono text-dds-text-secondary truncate">
                            {pod.nodeName || 'Unscheduled'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    {pod.restarts > 0 && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded-md ${
                            pod.restarts >= 5
                                ? 'bg-dds-red/10 text-dds-red border border-dds-red/20'
                                : 'bg-dds-yellow/10 text-dds-yellow border border-dds-yellow/20'
                        }`}>
                            <RotateCcw size={10} />
                            {pod.restarts}
                        </span>
                    )}

                    <span className="text-[12px] font-mono text-dds-text-secondary w-10 text-right">
                        {formatAge(pod.age)}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono rounded-md ${config.bg} ${config.color} border border-transparent`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {pod.status}
                    </span>

                    <Terminal size={14} className={`flex-shrink-0 transition-colors ${
                        isSelected ? 'text-dds-blue' : 'text-dds-text-muted'
                    }`} />
                </div>
            </div>

            {pod.containers.length > 1 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {pod.containers.map((c) => (
                        <span
                            key={c.name}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border ${
                                c.ready
                                    ? 'bg-dds-green/5 border-dds-green/20 text-dds-green'
                                    : 'bg-dds-red/5 border-dds-red/20 text-dds-red'
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

function LogsViewer({ clusterId, pod, namespace, onClose }: { clusterId: string; pod: K8sPod; namespace: string; onClose: () => void; }) {
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
            className="flex flex-col bg-dds-bg border border-dds-border rounded-md overflow-hidden h-full shadow-sm"
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-dds-border bg-dds-surface">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Terminal size={15} className="text-dds-blue flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-dds-text-primary truncate">{pod.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-mono ${config.color}`}>
                                <span className={`w-1 h-1 rounded-full ${config.dot}`} />
                                {pod.status}
                            </span>
                            {pod.nodeName && (
                                <span className="text-[11px] font-mono text-dds-text-muted">
                                    · {pod.nodeName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {pod.containers.length > 1 && (
                        <select
                            value={selectedContainer || ''}
                            onChange={(e) => setSelectedContainer(e.target.value || undefined)}
                            className="input text-[11px] font-mono py-1 px-2 h-auto"
                        >
                            {pod.containers.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    )}

                    <select
                        value={tailLines}
                        onChange={(e) => setTailLines(Number(e.target.value))}
                        className="input text-[11px] font-mono py-1 px-2 h-auto"
                    >
                        <option value={50}>50 lines</option>
                        <option value={100}>100 lines</option>
                        <option value={500}>500 lines</option>
                        <option value={1000}>1000 lines</option>
                    </select>

                    <button
                        onClick={handleRefresh}
                        disabled={isFetching}
                        className="p-1.5 rounded-md hover:bg-dds-muted text-dds-text-muted hover:text-dds-text-primary transition-colors disabled:opacity-50"
                        title="Refresh logs"
                    >
                        <RefreshCcw size={14} className={isFetching ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-dds-muted text-dds-text-muted hover:text-dds-text-primary transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed bg-[#0F111A]">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={20} className="animate-spin text-dds-text-muted" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <XCircle size={24} className="text-dds-red mb-2" />
                        <p className="text-[13px] text-dds-red">
                            {(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to fetch logs'}
                        </p>
                    </div>
                ) : logLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Terminal size={24} className="text-dds-text-muted mb-2" />
                        <p className="text-[13px] text-dds-text-secondary">No logs available</p>
                        <p className="text-[12px] text-dds-text-muted mt-1">
                            This pod hasn't emitted any logs yet.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {logLines.map((line, i) => (
                            <div
                                key={i}
                                className="group flex hover:bg-white/5 rounded px-1 -mx-1"
                            >
                                <span className="select-none text-dds-text-muted w-10 text-right pr-3 flex-shrink-0 tabular-nums">
                                    {i + 1}
                                </span>
                                <span className={`flex-1 break-all whitespace-pre-wrap ${
                                    line.toLowerCase().includes('error') || line.toLowerCase().includes('fatal')
                                        ? 'text-dds-red/90'
                                        : line.toLowerCase().includes('warn')
                                        ? 'text-dds-yellow/80'
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

const PodsPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const { data: clusters = [], isLoading: loadingClusters } = useClusters();
    const connectedClusters = useMemo(
        () => clusters.filter(c => c.status === 'connected'),
        [clusters],
    );

    const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
    const activeClusterId = selectedClusterId || connectedClusters[0]?._id || null;

    const { data: namespaces = [], isLoading: loadingNs } = useClusterNamespaces(activeClusterId);
    const [namespace, setNamespace] = useState(searchParams.get('namespace') || 'default');

    const { data: pods = [], isLoading: loadingPods, isFetching: fetchingPods } = useClusterPods(activeClusterId, namespace);

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedPod, setSelectedPod] = useState<K8sPod | null>(null);

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
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Page header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Box size={24} className="text-dds-text-primary" />
                            <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Pod Observability</h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <ClusterSelector
                                clusters={connectedClusters}
                                selectedId={activeClusterId}
                                onSelect={handleClusterChange}
                            />

                            {activeClusterId && namespaces.length > 0 && (
                                <NamespaceSelector
                                    namespaces={namespaces}
                                    selected={namespace}
                                    onSelect={handleNamespaceChange}
                                    isLoading={loadingNs}
                                />
                            )}

                            <button
                                onClick={handleRefreshPods}
                                disabled={fetchingPods || !activeClusterId}
                                className="btn-secondary"
                            >
                                <RefreshCcw size={14} className={fetchingPods ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {!loadingClusters && connectedClusters.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-24 text-center"
                        >
                            <Server size={40} className="text-dds-text-muted mb-4" />
                            <p className="text-[14px] font-medium text-dds-text-primary mb-1">No connected clusters</p>
                            <p className="text-[13px] text-dds-text-secondary">
                                Connect a Kubernetes cluster first to view pods.
                            </p>
                            <button
                                onClick={() => navigate('/clusters')}
                                className="btn-primary mt-4"
                            >
                                Go to Clusters
                            </button>
                        </motion.div>
                    ) : loadingPods ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                <SummaryCard icon={Box} label="Total Pods" value={summary.total} color="bg-dds-blue" />
                                <SummaryCard icon={CheckCircle2} label="Running" value={summary.running} color="bg-dds-green" />
                                <SummaryCard icon={Clock} label="Pending" value={summary.pending} color="bg-dds-yellow" />
                                <SummaryCard icon={XCircle} label="Failed" value={summary.failed} color="bg-dds-red" />
                                <SummaryCard icon={Activity} label="Succeeded" value={summary.succeeded} color="bg-dds-primary" />
                            </div>

                            {/* Status filter pills */}
                            <div className="flex items-center gap-2 mt-2">
                                <Filter size={14} className="text-dds-text-muted mr-1" />
                                {['all', 'Running', 'Pending', 'Failed', 'Succeeded'].map((f) => {
                                    const isActive = statusFilter === f.toLowerCase() || (f === 'all' && statusFilter === 'all');
                                    const filterKey = f === 'all' ? 'all' : f;
                                    return (
                                        <button
                                            key={f}
                                            onClick={() => setStatusFilter(filterKey === 'all' ? 'all' : filterKey)}
                                            className={`px-3 py-1 text-[12px] font-mono rounded-md border transition-all ${
                                                isActive
                                                    ? 'bg-dds-blue/10 border-dds-blue text-dds-blue'
                                                    : 'bg-dds-surface border-dds-border text-dds-text-muted hover:text-dds-text-primary hover:border-dds-text-muted'
                                            }`}
                                        >
                                            {f === 'all' ? 'All' : f}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Main content: Pod list + Logs viewer */}
                            <div className={`grid gap-4 ${selectedPod ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Box size={14} className="text-dds-text-muted" />
                                        <h2 className="text-[13px] font-medium text-dds-text-primary">
                                            Pods
                                            <span className="ml-1.5 font-mono text-dds-text-secondary">
                                                ({filteredPods.length})
                                            </span>
                                        </h2>
                                        {fetchingPods && (
                                            <Loader2 size={12} className="animate-spin text-dds-text-muted" />
                                        )}
                                    </div>

                                    {filteredPods.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="card flex flex-col items-center justify-center py-16 text-center"
                                        >
                                            <Box size={32} className="text-dds-text-muted mb-3" />
                                            <p className="text-[13px] text-dds-text-secondary">
                                                {statusFilter === 'all'
                                                    ? `No pods found in "${namespace}"`
                                                    : `No ${statusFilter} pods in "${namespace}"`}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-2 scrollbar-thin">
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
