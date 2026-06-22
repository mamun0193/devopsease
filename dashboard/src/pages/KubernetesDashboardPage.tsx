import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Box,
    Network,
    Layers,
    Loader2,
    ArrowLeft,
    ChevronDown,
    AlertTriangle,
} from 'lucide-react';
import RefreshButton from '../components/RefreshButton';
import { useNavigate } from 'react-router-dom';
import { useClusters, useClusterNamespaces, useClusterOverview } from '../hooks/useClusters';
import type {
    K8sCluster,
    K8sDashboardPod,
    K8sDashboardService,
    K8sDashboardDeployment,
} from '../api';

// Helpers

function timeAgo(isoString: string | null): string {
    if (!isoString) return '—';
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

function podStatusColor(status: string): string {
    switch (status) {
        case 'Running':
            return 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25';
        case 'Succeeded':
            return 'bg-blue-500/15 text-blue-400 ring-blue-500/25';
        case 'Pending':
            return 'bg-amber-500/15 text-amber-400 ring-amber-500/25';
        case 'Failed':
            return 'bg-red-500/15 text-red-400 ring-red-500/25';
        default:
            return 'bg-slate-500/15 text-slate-400 ring-slate-500/25';
    }
}

function podStatusDot(status: string): string {
    switch (status) {
        case 'Running': return 'bg-emerald-400';
        case 'Succeeded': return 'bg-blue-400';
        case 'Pending': return 'bg-amber-400';
        case 'Failed': return 'bg-red-400';
        default: return 'bg-slate-400';
    }
}

// Summary Card 

function SummaryCard({
    icon: Icon,
    label,
    value,
    gradient,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    gradient: string;
}) {
    return (
        <motion.div
            className="relative overflow-hidden bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
        >
            <div className={`absolute inset-0 opacity-[0.04] ${gradient}`} />
            <div className="relative flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}>
                    <Icon size={20} className="text-white" />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
                    <p className="text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
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
    const connected = clusters.filter((c) => c.status === 'connected');
    const selected = connected.find((c) => c._id === selectedId);

    if (connected.length === 0) {
        return (
            <div className="text-sm text-slate-500 italic">No connected clusters</div>
        );
    }

    return (
        <div className="relative">
            <button
                id="cluster-selector"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-200 hover:border-slate-600 transition-colors min-w-[200px]"
            >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="truncate flex-1 text-left">{selected?.name ?? 'Select cluster'}</span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute mt-1 z-50 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
                    >
                        {connected.map((c) => (
                            <button
                                key={c._id}
                                onClick={() => { onSelect(c._id); setOpen(false); }}
                                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                                    c._id === selectedId
                                        ? 'bg-blue-600/20 text-blue-300'
                                        : 'text-slate-300 hover:bg-slate-700/60'
                                }`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {c.name}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Namespace Selector 

function NamespaceSelector({
    clusterId,
    selectedNamespace,
    onSelect,
}: {
    clusterId: string | null;
    selectedNamespace: string;
    onSelect: (ns: string) => void;
}) {
    const { data: namespaces = [] } = useClusterNamespaces(clusterId);

    return (
        <div className="relative">
            <select
                id="namespace-selector"
                value={selectedNamespace}
                onChange={(e) => onSelect(e.target.value)}
                disabled={!clusterId}
                className="appearance-none px-3 py-2 pr-8 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-200 hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
                {namespaces.length === 0 && (
                    <option value="default">default</option>
                )}
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

// Section Header 

function SectionHeader({
    icon: Icon,
    title,
    count,
    color,
}: {
    icon: React.ElementType;
    title: string;
    count: number;
    color: string;
}) {
    return (
        <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
                <Icon size={14} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-slate-200">
                {title}
                <span className="ml-2 text-slate-600 font-normal">({count})</span>
            </h2>
        </div>
    );
}

// Pods Table 

function PodsTable({ pods }: { pods: K8sDashboardPod[] }) {
    if (pods.length === 0) {
        return (
            <div className="text-center py-8 text-sm text-slate-600">No pods found in this namespace</div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm" id="pods-table">
                <thead>
                    <tr className="border-b border-slate-700/50">
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Restarts</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                    </tr>
                </thead>
                <tbody>
                    <AnimatePresence mode="popLayout">
                        {pods.map((pod) => (
                            <motion.tr
                                key={pod.name}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                            >
                                <td className="py-2.5 px-3 text-slate-200 font-mono text-xs truncate max-w-[240px]">{pod.name}</td>
                                <td className="py-2.5 px-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ring-1 ${podStatusColor(pod.status)}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${podStatusDot(pod.status)}`} />
                                        {pod.status}
                                    </span>
                                </td>
                                <td className={`py-2.5 px-3 text-right tabular-nums ${pod.restarts > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                    {pod.restarts}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">{timeAgo(pod.age)}</td>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </tbody>
            </table>
        </div>
    );
}

// Deployments Table 

function DeploymentsTable({ deployments }: { deployments: K8sDashboardDeployment[] }) {
    if (deployments.length === 0) {
        return (
            <div className="text-center py-8 text-sm text-slate-600">No deployments found</div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm" id="deployments-table">
                <thead>
                    <tr className="border-b border-slate-700/50">
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Replicas</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Available</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Age</th>
                    </tr>
                </thead>
                <tbody>
                    <AnimatePresence mode="popLayout">
                        {deployments.map((dep) => {
                            const healthy = dep.availableReplicas >= dep.replicas;
                            return (
                                <motion.tr
                                    key={dep.name}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="py-2.5 px-3 text-slate-200 font-mono text-xs truncate max-w-[240px]">{dep.name}</td>
                                    <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">{dep.replicas}</td>
                                    <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${healthy ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {dep.availableReplicas}/{dep.replicas}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">{timeAgo(dep.age)}</td>
                                </motion.tr>
                            );
                        })}
                    </AnimatePresence>
                </tbody>
            </table>
        </div>
    );
}

// Services Table 

function ServicesTable({ services }: { services: K8sDashboardService[] }) {
    if (services.length === 0) {
        return (
            <div className="text-center py-8 text-sm text-slate-600">No services found</div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm" id="services-table">
                <thead>
                    <tr className="border-b border-slate-700/50">
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Ports</th>
                    </tr>
                </thead>
                <tbody>
                    <AnimatePresence mode="popLayout">
                        {services.map((svc) => (
                            <motion.tr
                                key={svc.name}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                            >
                                <td className="py-2.5 px-3 text-slate-200 font-mono text-xs truncate max-w-[200px]">{svc.name}</td>
                                <td className="py-2.5 px-3">
                                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-slate-700/60 text-slate-300">
                                        {svc.type}
                                    </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 text-xs font-mono">
                                    {svc.ports.map((p, i) => (
                                        <span key={i}>
                                            {i > 0 && <span className="text-slate-600 mx-1">·</span>}
                                            {p.port}→{p.targetPort}/{p.protocol}
                                        </span>
                                    ))}
                                </td>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </tbody>
            </table>
        </div>
    );
}

// Error Banner 

function ErrorBanner({ message }: { message: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-red-500/8 border border-red-500/20 rounded-xl mb-6"
        >
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{message}</p>
        </motion.div>
    );
}

// Page 

const KubernetesDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: clusters = [], isLoading: clustersLoading } = useClusters();

    const connectedClusters = useMemo(
        () => clusters.filter((c) => c.status === 'connected'),
        [clusters],
    );

    const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
    const [namespace, setNamespace] = useState('default');

    // Auto-select first connected cluster
    const clusterId = selectedClusterId ?? connectedClusters[0]?._id ?? null;

    const {
        data: overview,
        isLoading: overviewLoading,
        isError,
        error,
        refetch,
        isFetching,
    } = useClusterOverview(clusterId, namespace);

    const pods = overview?.pods ?? [];
    const services = overview?.services ?? [];
    const deployments = overview?.deployments ?? [];

    const errorMessage = isError
        ? (error as any)?.response?.data?.message
            || (error as any)?.message
            || 'Failed to fetch cluster overview'
        : null;

    const isLoading = clustersLoading || overviewLoading;

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
                        
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/clusters')}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                                id="back-to-clusters"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <LayoutDashboard size={18} className="text-white" />
                                </div>
                                <h1 className="text-2xl font-bold text-slate-100">Cluster Dashboard</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <ClusterSelector
                                clusters={clusters}
                                selectedId={clusterId}
                                onSelect={(id) => {
                                    setSelectedClusterId(id);
                                    setNamespace('default');
                                }}
                            />
                            <NamespaceSelector
                                clusterId={clusterId}
                                selectedNamespace={namespace}
                                onSelect={setNamespace}
                            />
                            <RefreshButton
                                onRefresh={() => { refetch(); }}
                                isFetching={isFetching}
                                isLoading={!clusterId}
                                size="md"
                            />
                        </div>
                    </div>

                    {/* Error Banner */}
                    {errorMessage && <ErrorBanner message={errorMessage} />}

                    {/* Loading */}
                    {isLoading && !overview ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2 size={28} className="animate-spin text-slate-500 mb-3" />
                            <p className="text-sm text-slate-600">Loading cluster overview…</p>
                        </div>
                    ) : !clusterId ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-24 text-center"
                        >
                            <LayoutDashboard size={48} className="text-slate-700 mb-4" />
                            <p className="text-sm text-slate-500 mb-1">No connected clusters available</p>
                            <p className="text-xs text-slate-600">
                                Connect a cluster on the{' '}
                                <button onClick={() => navigate('/clusters')} className="text-blue-400 hover:underline">
                                    Clusters page
                                </button>{' '}
                                to view the dashboard.
                            </p>
                        </motion.div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <SummaryCard
                                    icon={Box}
                                    label="Total Pods"
                                    value={pods.length}
                                    gradient="bg-gradient-to-br from-cyan-600 to-blue-600"
                                />
                                <SummaryCard
                                    icon={Layers}
                                    label="Deployments"
                                    value={deployments.length}
                                    gradient="bg-gradient-to-br from-violet-600 to-purple-600"
                                />
                                <SummaryCard
                                    icon={Network}
                                    label="Services"
                                    value={services.length}
                                    gradient="bg-gradient-to-br from-amber-600 to-orange-600"
                                />
                            </div>

                            {/* Live indicator */}
                            <div className="flex items-center gap-2 mb-6">
                                <div className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                </div>
                                <span className="text-xs text-slate-600">Auto-refreshing every 10s</span>
                            </div>

                            {/* Resource Sections */}
                            <div className="space-y-6">
                                {/* Pods */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-5"
                                >
                                    <SectionHeader icon={Box} title="Pods" count={pods.length} color="bg-cyan-600/30" />
                                    <PodsTable pods={pods} />
                                </motion.div>

                                {/* Deployments */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-5"
                                >
                                    <SectionHeader icon={Layers} title="Deployments" count={deployments.length} color="bg-violet-600/30" />
                                    <DeploymentsTable deployments={deployments} />
                                </motion.div>

                                {/* Services */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-5"
                                >
                                    <SectionHeader icon={Network} title="Services" count={services.length} color="bg-amber-600/30" />
                                    <ServicesTable services={services} />
                                </motion.div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default KubernetesDashboardPage;
