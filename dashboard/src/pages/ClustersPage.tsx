import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cloud,
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowLeft,
    Plus,
    Server,
    Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Header from '../components/Header';
import type { FilterItem } from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import { useClusters, useConnectCluster } from '../hooks/useClusters';
import { addToast } from '../store/toastSlice';
import type { K8sCluster } from '../api';

/* ── Summary Card ─────────────────────────────────────────────────────────── */

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

/* ── Cluster Row ──────────────────────────────────────────────────────────── */

function ClusterRow({ cluster }: { cluster: K8sCluster }) {
    const isConnected = cluster.status === 'connected';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 hover:border-slate-600/60 transition-colors"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isConnected ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}>
                        {isConnected ? (
                            <CheckCircle2 size={15} className="text-emerald-400" />
                        ) : (
                            <XCircle size={15} className="text-red-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                            {cluster.name}
                        </p>
                        <p className="text-xs text-slate-500">
                            {new Date(cluster.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                        isConnected
                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            isConnected ? 'bg-emerald-400' : 'bg-red-400'
                        }`} />
                        {isConnected ? 'Connected' : 'Failed'}
                    </span>
                </div>
            </div>

            {!isConnected && cluster.lastError && (
                <div className="mt-3 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg">
                    <p className="text-xs text-red-400/90 leading-relaxed line-clamp-2">
                        {cluster.lastError}
                    </p>
                </div>
            )}
        </motion.div>
    );
}

/* ── Connect Form ─────────────────────────────────────────────────────────── */

function ConnectForm({ onSuccess }: { onSuccess?: () => void }) {
    const dispatch = useDispatch();
    const connectCluster = useConnectCluster();
    const [name, setName] = useState('');
    const [kubeconfig, setKubeconfig] = useState('');
    const [lastResult, setLastResult] = useState<K8sCluster | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLastResult(null);

        connectCluster.mutate(
            { name: name.trim(), kubeconfig: kubeconfig.trim() },
            {
                onSuccess: (cluster) => {
                    setLastResult(cluster);
                    if (cluster.status === 'connected') {
                        dispatch(addToast({
                            message: `Cluster "${cluster.name}" connected successfully`,
                            type: 'success',
                            duration: 4000,
                        }));
                        setName('');
                        setKubeconfig('');
                        onSuccess?.();
                    } else {
                        dispatch(addToast({
                            message: `Cluster "${cluster.name}" connection failed`,
                            type: 'error',
                            duration: 6000,
                        }));
                    }
                },
                onError: (err: any) => {
                    dispatch(addToast({
                        message: err?.response?.data?.message || err?.message || 'Failed to connect cluster',
                        type: 'error',
                        duration: 6000,
                    }));
                },
            }
        );
    };

    const isSubmitting = connectCluster.isPending;
    const canSubmit = name.trim().length > 0 && kubeconfig.trim().length > 0 && !isSubmitting;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-5"
        >
            <div className="flex items-center gap-2 mb-4">
                <Plus size={16} className="text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Connect a Cluster</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Cluster Name */}
                <div>
                    <label htmlFor="cluster-name" className="block text-xs font-medium text-slate-400 mb-1.5">
                        Cluster Name
                    </label>
                    <input
                        id="cluster-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., production-cluster"
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all disabled:opacity-50"
                    />
                </div>

                {/* Kubeconfig */}
                <div>
                    <label htmlFor="kubeconfig-input" className="block text-xs font-medium text-slate-400 mb-1.5">
                        Kubeconfig
                    </label>
                    <textarea
                        id="kubeconfig-input"
                        value={kubeconfig}
                        onChange={(e) => setKubeconfig(e.target.value)}
                        placeholder="Paste your kubeconfig YAML here..."
                        rows={8}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all resize-y disabled:opacity-50"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <Shield size={11} className="text-slate-600" />
                        <p className="text-[11px] text-slate-600">
                            Your kubeconfig is encrypted at rest and never logged.
                        </p>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            Connecting…
                        </>
                    ) : (
                        <>
                            <Cloud size={14} />
                            Connect Cluster
                        </>
                    )}
                </button>
            </form>

            {/* Result Feedback */}
            <AnimatePresence>
                {lastResult && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden"
                    >
                        <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-lg border ${
                            lastResult.status === 'connected'
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-red-500/5 border-red-500/20'
                        }`}>
                            {lastResult.status === 'connected' ? (
                                <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                            ) : (
                                <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <p className={`text-sm font-medium ${
                                    lastResult.status === 'connected' ? 'text-emerald-300' : 'text-red-300'
                                }`}>
                                    {lastResult.status === 'connected'
                                        ? `Connected to "${lastResult.name}" ✅`
                                        : `Failed to connect "${lastResult.name}" ❌`
                                    }
                                </p>
                                {lastResult.lastError && (
                                    <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                                        {lastResult.lastError}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

const ClustersPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: clusters = [], isLoading } = useClusters();

    const [activeFilter, setActiveFilter] = useState<string>('all');

    const summary = useMemo(() => ({
        total: clusters.length,
        connected: clusters.filter((c) => c.status === 'connected').length,
        failed: clusters.filter((c) => c.status === 'failed').length,
    }), [clusters]);

    const filteredClusters = useMemo(() => {
        switch (activeFilter) {
            case 'connected': return clusters.filter((c) => c.status === 'connected');
            case 'failed':    return clusters.filter((c) => c.status === 'failed');
            default:          return clusters;
        }
    }, [clusters, activeFilter]);

    const filterItems: FilterItem[] = useMemo(() => [
        {
            key: 'all',
            label: 'Total',
            count: summary.total,
            color: 'text-slate-300',
            activeBg: 'bg-slate-700',
            activeBorder: 'border-slate-600',
            icon: <Cloud size={14} className="text-slate-400" />,
        },
        {
            key: 'connected',
            label: 'Connected',
            count: summary.connected,
            color: 'text-emerald-400',
            activeBg: 'bg-emerald-500/20',
            activeBorder: 'border-emerald-500/50',
            dot: 'bg-emerald-500',
        },
        {
            key: 'failed',
            label: 'Failed',
            count: summary.failed,
            color: 'text-red-400',
            activeBg: 'bg-red-500/20',
            activeBorder: 'border-red-500/50',
            icon: <XCircle size={14} className="text-red-400" />,
        },
    ], [summary]);

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header onFilterChange={setActiveFilter} activeFilter={activeFilter} filterItems={filterItems} />
            <ResourceNav />

            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Page Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-bold text-slate-100">Kubernetes Clusters</h1>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-slate-500" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                                <SummaryCard icon={Cloud} label="Total Clusters" value={summary.total} color="bg-blue-600/20" />
                                <SummaryCard icon={CheckCircle2} label="Connected" value={summary.connected} color="bg-emerald-600/20" />
                                <SummaryCard icon={XCircle} label="Failed" value={summary.failed} color="bg-red-600/20" />
                            </div>

                            {/* Two-column layout: form + list */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                {/* Connect Form */}
                                <div className="lg:col-span-2">
                                    <ConnectForm />
                                </div>

                                {/* Cluster List */}
                                <div className="lg:col-span-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Server size={14} className="text-slate-500" />
                                        <h2 className="text-sm font-semibold text-slate-300">
                                            Your Clusters
                                            <span className="ml-1.5 text-slate-600">
                                                ({filteredClusters.length})
                                            </span>
                                        </h2>
                                    </div>

                                    {filteredClusters.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex flex-col items-center justify-center py-16 text-center"
                                        >
                                            <Cloud size={36} className="text-slate-700 mb-3" />
                                            <p className="text-sm text-slate-500">
                                                {activeFilter === 'all'
                                                    ? 'No clusters connected yet'
                                                    : `No ${activeFilter} clusters`}
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1">
                                                Paste a kubeconfig to connect your first cluster.
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            <AnimatePresence mode="popLayout">
                                                {filteredClusters.map((cluster) => (
                                                    <ClusterRow key={cluster._id} cluster={cluster} />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ClustersPage;
