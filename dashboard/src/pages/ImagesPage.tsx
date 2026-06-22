import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import {
    Layers,
    HardDrive,
    Database,
    CheckCircle2,
    AlertTriangle,
    XOctagon,
    Loader2,
    Server,
    Clock,
    ChevronRight,
    Trash2,
    X,
    Sparkles,
    ShieldCheck,
    Upload,
    Download,
} from 'lucide-react';
import PushImageModal from '../components/registry/PushImageModal';
import { imageApi } from '../api';
import { useDockerHubStatus } from '../hooks/useDockerHub';
import { addToast } from '../store/toastSlice';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
    ACTIVE: { color: 'text-dds-green', bg: 'bg-dds-green/10', border: 'border-dds-green/30', label: 'Active' },
    UNUSED: { color: 'text-dds-yellow', bg: 'bg-dds-yellow/10', border: 'border-dds-yellow/30', label: 'Unused' },
    DANGLING: { color: 'text-dds-red', bg: 'bg-dds-red/10', border: 'border-dds-red/30', label: 'Dangling' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.UNUSED;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono tracking-wide ${config.color} ${config.bg} border ${config.border}`}>
            {config.label}
        </span>
    );
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

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatSize(mb: number): string {
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
}

type ImageFilter = 'all' | 'ACTIVE' | 'UNUSED' | 'DANGLING';

interface PruneCandidate {
    id: string;
    tag: string;
    sizeMB: number;
}

interface PruneResult {
    reclaimedMB: number;
    deletedCount: number;
    errors: Array<{ imageId: string; tag: string; error: string }>;
}

function PruneModal({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const [candidates, setCandidates] = useState<PruneCandidate[]>([]);
    const [totalReclaimableMB, setTotalReclaimableMB] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pruning, setPruning] = useState(false);
    const [result, setResult] = useState<PruneResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await imageApi.prunePreview();
                if (cancelled) return;
                setCandidates(data.candidates);
                setTotalReclaimableMB(data.totalReclaimableMB);
            } catch (err: any) {
                if (!cancelled) setError(err?.response?.data?.message || err.message || 'Failed to load preview');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handlePrune = useCallback(async () => {
        setPruning(true);
        setError(null);
        try {
            const res = await imageApi.pruneUnused();
            setResult(res);
            queryClient.invalidateQueries({ queryKey: ['images'] });
            queryClient.invalidateQueries({ queryKey: ['images-usage-summary'] });
        } catch (err: any) {
            setError(err?.response?.data?.message || err.message || 'Prune failed');
        } finally {
            setPruning(false);
        }
    }, [queryClient]);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="w-full max-w-lg bg-dds-elevated border border-dds-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-dds-border bg-dds-surface">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-dds-orange/10 flex items-center justify-center border border-dds-orange/20">
                                <Sparkles size={20} className="text-dds-orange" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-dds-text-primary">Safe Clean Storage</h2>
                                <p className="text-[13px] text-dds-text-muted">Remove unused & dangling images.</p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={pruning} className="text-dds-text-muted hover:text-dds-text-primary disabled:opacity-50">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                                <p className="text-[13px] text-dds-text-muted">Scanning for reclaimable images…</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center py-8 gap-2">
                                <XOctagon size={28} className="text-dds-red" />
                                <p className="text-[13px] text-dds-red">{error}</p>
                            </div>
                        ) : result ? (
                            <div className="flex flex-col items-center py-6 gap-3">
                                <div className="w-12 h-12 rounded-full bg-dds-green/15 flex items-center justify-center">
                                    <ShieldCheck size={24} className="text-dds-green" />
                                </div>
                                <p className="text-base font-semibold text-dds-text-primary">
                                    {result.deletedCount > 0 ? 'Storage Cleaned' : 'Nothing to clean'}
                                </p>
                                {result.deletedCount > 0 && (
                                    <p className="text-[13px] text-dds-green">
                                        Reclaimed {formatSize(result.reclaimedMB)} from {result.deletedCount} image{result.deletedCount !== 1 ? 's' : ''}
                                    </p>
                                )}
                                {result.errors.length > 0 && (
                                    <div className="w-full mt-3 bg-dds-red/10 border border-dds-red/30 rounded-xl p-3">
                                        <p className="text-[11px] font-mono text-dds-red mb-1.5 uppercase">Partial failures ({result.errors.length})</p>
                                        {result.errors.map((e, i) => (
                                            <p key={i} className="text-[12px] text-dds-red/80 truncate">{e.tag}: {e.error}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="flex flex-col items-center py-8 gap-2">
                                <CheckCircle2 size={28} className="text-dds-green" />
                                <p className="text-[13px] text-dds-text-secondary">No reclaimable images found</p>
                                <p className="text-[12px] text-dds-text-muted">All images are in use or recently built</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[13px] text-dds-text-secondary">
                                        {candidates.length} image{candidates.length !== 1 ? 's' : ''} can be removed
                                    </p>
                                    <span className="text-[13px] font-mono font-medium text-dds-orange">{formatSize(totalReclaimableMB)} reclaimable</span>
                                </div>
                                <div className="rounded-xl border border-dds-border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-dds-border bg-dds-muted/50">
                                                <th className="text-left px-4 py-2.5 text-[11px] font-mono text-dds-text-muted uppercase">Tag</th>
                                                <th className="text-right px-4 py-2.5 text-[11px] font-mono text-dds-text-muted uppercase">Size</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {candidates.map((c) => (
                                                <tr key={c.id} className="border-b border-dds-border last:border-0 hover:bg-dds-muted/30">
                                                    <td className="px-4 py-2.5 text-[13px] text-dds-text-primary truncate max-w-[240px]">{c.tag}</td>
                                                    <td className="px-4 py-2.5 text-right text-[13px] font-mono text-dds-text-secondary">{formatSize(c.sizeMB)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dds-border bg-dds-surface">
                        {result ? (
                            <button
                                onClick={onClose}
                                className="btn-primary"
                            >
                                Done
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    className="btn-secondary"
                                    disabled={pruning}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePrune}
                                    disabled={pruning || loading || candidates.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-dds-orange/15 text-dds-orange rounded-md text-sm font-medium hover:bg-dds-orange/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {pruning ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    {pruning ? 'Cleaning…' : 'Confirm Clean'}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function PruneBuildCacheModal({ onClose, currentCacheSizeMB }: { onClose: () => void, currentCacheSizeMB: number }) {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const [pruning, setPruning] = useState(false);
    const [result, setResult] = useState<{ reclaimedMB: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePrune = useCallback(async () => {
        setPruning(true);
        setError(null);
        try {
            const res = await imageApi.pruneBuildCache();
            setResult(res);
            queryClient.invalidateQueries({ queryKey: ['images-usage-summary'] });
            dispatch(addToast({
                message: `Build cache cleaned (${formatSize(res.reclaimedMB)} reclaimed)`,
                type: 'success',
                duration: 4000,
            }));
        } catch (err: any) {
            setError(err?.response?.data?.error || err.message || 'Build cache prune failed');
            dispatch(addToast({ message: 'Build cache prune failed', type: 'error', duration: 5000 }));
        } finally {
            setPruning(false);
        }
    }, [dispatch, queryClient]);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="w-full max-w-lg bg-dds-elevated border border-dds-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-dds-border bg-dds-surface">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-dds-primary/10 flex items-center justify-center border border-dds-primary/20">
                                <Database size={20} className="text-dds-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-dds-text-primary">Clean Build Cache</h2>
                                <p className="text-[13px] text-dds-text-muted leading-tight pb-0.5">Free up space used by Docker builds.</p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={pruning} className="text-dds-text-muted hover:text-dds-text-primary disabled:opacity-50">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-dds-red/10 border border-dds-red/20 flex gap-3">
                                <AlertTriangle size={18} className="text-dds-red shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[13px] font-medium text-dds-red">Prune Failed</p>
                                    <p className="text-[13px] text-dds-red/80 mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        {result ? (
                            <div className="flex flex-col items-center py-8 gap-4">
                                <div className="w-16 h-16 rounded-full bg-dds-green/10 flex items-center justify-center border border-dds-green/20 mb-2">
                                    <CheckCircle2 size={32} className="text-dds-green" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-dds-text-primary mb-1">Cache Cleaned</h3>
                                    <p className="text-dds-text-secondary text-[13px]">Successfully reclaimed storage space.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-dds-bg border border-dds-border w-full mt-4 flex items-center justify-between">
                                    <span className="text-[13px] text-dds-text-secondary">Space reclaimed</span>
                                    <span className="font-mono font-semibold text-dds-green">{formatSize(result.reclaimedMB)}</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 rounded-xl bg-dds-bg border border-dds-border w-full flex flex-col gap-2 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] text-dds-text-secondary">Current Cache Size</span>
                                        <span className="font-mono font-semibold text-dds-text-primary">{formatSize(currentCacheSizeMB)}</span>
                                    </div>
                                    <p className="text-[12px] text-dds-text-muted leading-relaxed mt-2 border-t border-dds-border pt-3">
                                        This action asks Docker Engine to clear all unneeded build cache data. Only cache data that is safely removable will be deleted.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dds-border bg-dds-surface">
                        {result ? (
                            <button
                                onClick={onClose}
                                className="btn-primary"
                            >
                                Done
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    className="btn-secondary"
                                    disabled={pruning}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePrune}
                                    disabled={pruning || currentCacheSizeMB <= 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-dds-primary/15 text-dds-primary rounded-md text-sm font-medium hover:bg-dds-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {pruning ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                                    {pruning ? 'Cleaning…' : 'Clean Cache'}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

const ImagesPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState<ImageFilter>('all');
    const [showPruneModal, setShowPruneModal] = useState(false);
    const [showBuildCacheModal, setShowBuildCacheModal] = useState(false);
    const [pushTarget, setPushTarget] = useState<{ imageId: string; imageTag: string } | null>(null);
    const { data: dockerHubStatus } = useDockerHubStatus();
    const isHubConnected = dockerHubStatus?.connected === true;

    const { data: images = [], isLoading: imagesLoading } = useQuery({
        queryKey: ['images'],
        queryFn: imageApi.listImages,
        staleTime: Infinity,
    });

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['images-usage-summary'],
        queryFn: imageApi.getUsageSummary,
        staleTime: Infinity,
    });

    const isLoading = imagesLoading || summaryLoading;

    const filteredImages = useMemo(() => {
        if (activeFilter === 'all') return images;
        return images.filter(img => img.imageUsageStatus === activeFilter);
    }, [images, activeFilter]);

    const filterCounts = useMemo(() => ({
        all: images.length,
        ACTIVE: images.filter(i => i.imageUsageStatus === 'ACTIVE').length,
        UNUSED: images.filter(i => i.imageUsageStatus === 'UNUSED').length,
        DANGLING: images.filter(i => i.imageUsageStatus === 'DANGLING').length,
    }), [images]);

    const hasUnused = filterCounts.UNUSED > 0 || filterCounts.DANGLING > 0;

    return (
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Page Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Layers size={24} className="text-dds-text-primary" />
                            <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Images</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowBuildCacheModal(true)}
                                disabled={isLoading || (summary?.buildCacheMB || 0) === 0}
                                className="btn-secondary"
                            >
                                <Database size={15} />
                                Clean Cache
                            </button>
                            <button
                                onClick={() => setShowPruneModal(true)}
                                disabled={!hasUnused || isLoading}
                                className="btn-secondary"
                            >
                                <Sparkles size={15} className="text-dds-orange" />
                                Safe Clean Storage
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Panel */}
                            {summary && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <SummaryCard icon={HardDrive} label="Total Storage" value={formatSize(summary.totalImageStorageMB)} color="bg-dds-blue" />
                                    <SummaryCard icon={Database} label="Build Cache" value={formatSize(summary.buildCacheMB)} color="bg-dds-primary" />
                                    <SummaryCard icon={CheckCircle2} label="Active" value={summary.activeImages} color="bg-dds-green" />
                                    <SummaryCard icon={AlertTriangle} label="Unused" value={summary.unusedImages} color="bg-dds-yellow" />
                                    <SummaryCard icon={XOctagon} label="Dangling" value={summary.danglingImages} color="bg-dds-red" />
                                </div>
                            )}

                            {/* Docker Hub Banner */}
                            <button
                                onClick={() => navigate('/registry')}
                                className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-dds-border bg-gradient-to-r from-dds-blue/10 via-dds-blue/5 to-transparent hover:border-dds-blue/40 group transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-dds-blue/15 flex items-center justify-center border border-dds-blue/25">
                                        <Download size={18} className="text-dds-blue" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[14px] font-medium text-dds-text-primary">Pull images from Docker Hub</p>
                                        <p className="text-[12px] text-dds-text-secondary mt-0.5">Connect your account to pull and push images</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-dds-text-muted group-hover:text-dds-blue transition-colors" />
                            </button>

                            {/* Image Table */}
                            <div className="card overflow-hidden">
                                {filteredImages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <Layers size={40} className="text-dds-text-muted mb-4" />
                                        <h3 className="text-lg font-medium text-dds-text-primary mb-1">No images yet</h3>
                                        <p className="text-sm text-dds-text-secondary max-w-sm">
                                            Build an image or pull from Docker Hub to see it listed here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse whitespace-nowrap">
                                            <thead>
                                                <tr className="border-b border-dds-border bg-dds-muted/50">
                                                    <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Tag</th>
                                                    <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Size</th>
                                                    <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Status</th>
                                                    <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Containers</th>
                                                    <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Last Used</th>
                                                    <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredImages.map((image, idx) => (
                                                    <tr
                                                        key={image._id}
                                                        className="border-b border-dds-border last:border-0 hover:bg-dds-muted/50 transition-colors"
                                                        onClick={() => navigate(`/images/${image._id}`)}
                                                    >
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                <Layers size={16} className="text-dds-text-muted" />
                                                                <span className="text-[13px] font-medium text-dds-text-primary max-w-[200px] truncate">{image.tag}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className="text-[12px] font-mono text-dds-text-secondary flex items-center gap-1.5">
                                                                <HardDrive size={12} className="text-dds-text-muted" />
                                                                {formatSize(image.sizeMB)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <StatusBadge status={image.imageUsageStatus} />
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            {image.attachedContainerIds.length > 0 ? (
                                                                <span className="text-[12px] font-mono text-dds-text-secondary flex items-center gap-1.5">
                                                                    <Server size={12} className="text-dds-text-muted" />
                                                                    {image.attachedContainerIds.length}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[12px] text-dds-text-muted">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className="text-[12px] font-mono text-dds-text-secondary flex items-center gap-1.5">
                                                                <Clock size={12} className="text-dds-text-muted" />
                                                                {formatDate(image.lastUsedAt)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPushTarget({ imageId: image._id, imageTag: image.tag });
                                                                }}
                                                                disabled={!isHubConnected}
                                                                className="btn-ghost text-dds-blue px-2 py-1 h-auto hover:bg-dds-blue/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                title={isHubConnected ? 'Push to Docker Hub' : 'Connect Docker Hub first'}
                                                            >
                                                                <Upload size={12} />
                                                                Push
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Prune Modals */}
            {showPruneModal && <PruneModal onClose={() => setShowPruneModal(false)} />}
            {showBuildCacheModal && <PruneBuildCacheModal onClose={() => setShowBuildCacheModal(false)} currentCacheSizeMB={summary?.buildCacheMB || 0} />}

            {/* Push Modal */}
            <PushImageModal
                isOpen={pushTarget !== null}
                onClose={() => setPushTarget(null)}
                imageId={pushTarget?.imageId || ''}
                imageTag={pushTarget?.imageTag || ''}
            />
        </div>
    );
};

export default ImagesPage;
