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
import { useClusters, useConnectCluster } from '../hooks/useClusters';
import { addToast } from '../store/toastSlice';
import type { K8sCluster } from '../api';

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

function ClusterRow({ cluster }: { cluster: K8sCluster }) {
    const isConnected = cluster.status === 'connected';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-dds-bg border border-dds-border rounded-md p-4 hover:border-dds-text-muted transition-colors"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        isConnected ? 'bg-dds-green/10' : 'bg-dds-red/10'
                    }`}>
                        {isConnected ? (
                            <CheckCircle2 size={15} className="text-dds-green" />
                        ) : (
                            <XCircle size={15} className="text-dds-red" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-dds-text-primary truncate">
                            {cluster.name}
                        </p>
                        <p className="text-[11px] font-mono text-dds-text-secondary">
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
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono rounded-md ${
                        isConnected
                            ? 'bg-dds-green/5 text-dds-green border border-dds-green/20'
                            : 'bg-dds-red/5 text-dds-red border border-dds-red/20'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            isConnected ? 'bg-dds-green' : 'bg-dds-red'
                        }`} />
                        {isConnected ? 'Connected' : 'Failed'}
                    </span>
                </div>
            </div>

            {!isConnected && cluster.lastError && (
                <div className="mt-3 px-3 py-2 bg-dds-red/5 border border-dds-red/10 rounded-md">
                    <p className="text-[12px] font-mono text-dds-red/90 leading-relaxed line-clamp-2">
                        {cluster.lastError}
                    </p>
                </div>
            )}
        </motion.div>
    );
}

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
            className="card p-5"
        >
            <div className="flex items-center gap-2 mb-4">
                <Plus size={16} className="text-dds-blue" />
                <h2 className="text-[13px] font-semibold text-dds-text-primary">Connect a Cluster</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="cluster-name" className="block text-[12px] font-medium text-dds-text-secondary mb-1.5">
                        Cluster Name
                    </label>
                    <input
                        id="cluster-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., production-cluster"
                        disabled={isSubmitting}
                        className="input w-full"
                    />
                </div>

                <div>
                    <label htmlFor="kubeconfig-input" className="block text-[12px] font-medium text-dds-text-secondary mb-1.5">
                        Kubeconfig
                    </label>
                    <textarea
                        id="kubeconfig-input"
                        value={kubeconfig}
                        onChange={(e) => setKubeconfig(e.target.value)}
                        placeholder="Paste your kubeconfig YAML here..."
                        rows={8}
                        disabled={isSubmitting}
                        className="input w-full font-mono text-[11px] resize-y"
                    />
                    <div className="flex items-center gap-1.5 mt-2">
                        <Shield size={11} className="text-dds-text-muted" />
                        <p className="text-[11px] text-dds-text-muted">
                            Your kubeconfig is encrypted at rest and never logged.
                        </p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="btn-primary w-full flex items-center justify-center gap-2"
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

            <AnimatePresence>
                {lastResult && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden"
                    >
                        <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-md border ${
                            lastResult.status === 'connected'
                                ? 'bg-dds-green/5 border-dds-green/20'
                                : 'bg-dds-red/5 border-dds-red/20'
                        }`}>
                            {lastResult.status === 'connected' ? (
                                <CheckCircle2 size={16} className="text-dds-green mt-0.5 flex-shrink-0" />
                            ) : (
                                <XCircle size={16} className="text-dds-red mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <p className={`text-[12px] font-medium ${
                                    lastResult.status === 'connected' ? 'text-dds-green' : 'text-dds-red'
                                }`}>
                                    {lastResult.status === 'connected'
                                        ? `Connected to "${lastResult.name}" ✅`
                                        : `Failed to connect "${lastResult.name}" ❌`
                                    }
                                </p>
                                {lastResult.lastError && (
                                    <p className="text-[11px] font-mono text-dds-red/80 mt-1 leading-relaxed">
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

    return (
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center gap-3">
                        <Cloud size={24} className="text-dds-text-primary" />
                        <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Kubernetes Clusters</h1>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <SummaryCard icon={Cloud} label="Total Clusters" value={summary.total} color="bg-dds-blue" />
                                <SummaryCard icon={CheckCircle2} label="Connected" value={summary.connected} color="bg-dds-green" />
                                <SummaryCard icon={XCircle} label="Failed" value={summary.failed} color="bg-dds-red" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <div className="lg:col-span-2">
                                    <ConnectForm />
                                </div>

                                <div className="lg:col-span-3">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Server size={14} className="text-dds-text-muted" />
                                        <h2 className="text-[13px] font-medium text-dds-text-primary">
                                            Your Clusters
                                            <span className="ml-1.5 font-mono text-dds-text-secondary">
                                                ({filteredClusters.length})
                                            </span>
                                        </h2>
                                    </div>

                                    {filteredClusters.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="card flex flex-col items-center justify-center py-16 text-center"
                                        >
                                            <Cloud size={36} className="text-dds-text-muted mb-3" />
                                            <p className="text-[13px] text-dds-text-secondary">
                                                {activeFilter === 'all'
                                                    ? 'No clusters connected yet'
                                                    : `No ${activeFilter} clusters`}
                                            </p>
                                            <p className="text-[12px] text-dds-text-muted mt-1">
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
