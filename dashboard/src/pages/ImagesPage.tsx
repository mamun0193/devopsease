import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
    Layers,
    HardDrive,
    Database,
    CheckCircle2,
    AlertTriangle,
    XOctagon,
    Loader2,
    ArrowLeft,
    Server,
    Clock,
    ChevronRight,
    Trash2,
    X,
    Sparkles,
    ShieldCheck,
} from 'lucide-react';
import Header from '../components/Header';
import type { FilterItem } from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import { imageApi } from '../api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
    ACTIVE: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Active' },
    UNUSED: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Unused' },
    DANGLING: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Dangling' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.UNUSED;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color} ${config.bg} border ${config.border}`}>
            {config.label}
        </span>
    );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
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
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    className="relative w-full max-w-lg mx-4 bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                                <Sparkles size={16} className="text-amber-400" />
                            </div>
                            <h2 className="text-base font-semibold text-slate-100">Safe Clean Storage</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <Loader2 size={24} className="animate-spin text-slate-500" />
                                <p className="text-sm text-slate-500">Scanning for reclaimable images…</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center py-8 gap-2">
                                <XOctagon size={28} className="text-red-400" />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        ) : result ? (
                            <div className="flex flex-col items-center py-6 gap-3">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                    <ShieldCheck size={24} className="text-emerald-400" />
                                </div>
                                <p className="text-base font-semibold text-slate-100">
                                    {result.deletedCount > 0 ? 'Storage Cleaned' : 'Nothing to clean'}
                                </p>
                                {result.deletedCount > 0 && (
                                    <p className="text-sm text-emerald-400">
                                        Reclaimed {formatSize(result.reclaimedMB)} from {result.deletedCount} image{result.deletedCount !== 1 ? 's' : ''}
                                    </p>
                                )}
                                {result.errors.length > 0 && (
                                    <div className="w-full mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                        <p className="text-xs font-medium text-red-400 mb-1.5">Partial failures ({result.errors.length})</p>
                                        {result.errors.map((e, i) => (
                                            <p key={i} className="text-xs text-red-300/80 truncate">{e.tag}: {e.error}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="flex flex-col items-center py-8 gap-2">
                                <CheckCircle2 size={28} className="text-emerald-400" />
                                <p className="text-sm text-slate-400">No reclaimable images found</p>
                                <p className="text-xs text-slate-600">All images are in use or recently built</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm text-slate-400">
                                        {candidates.length} image{candidates.length !== 1 ? 's' : ''} can be removed
                                    </p>
                                    <span className="text-sm font-semibold text-amber-400">{formatSize(totalReclaimableMB)} reclaimable</span>
                                </div>
                                <div className="rounded-xl border border-slate-800 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-800 bg-slate-800/40">
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Tag</th>
                                                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Size</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {candidates.map((c) => (
                                                <tr key={c.id} className="border-b border-slate-800/40 last:border-0">
                                                    <td className="px-4 py-2.5 text-slate-300 truncate max-w-[240px]">{c.tag}</td>
                                                    <td className="px-4 py-2.5 text-right text-slate-500">{formatSize(c.sizeMB)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
                        {result ? (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
                            >
                                Done
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePrune}
                                    disabled={pruning || loading || candidates.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            toast.success(`Build cache cleaned (${formatSize(res.reclaimedMB)} reclaimed)`, {
                icon: <Database size={16} className="text-emerald-400" />,
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #064e3b' }
            });
        } catch (err: any) {
            setError(err?.response?.data?.error || err.message || 'Build cache prune failed');
            toast.error('Build cache prune failed', {
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #7f1d1d' }
            });
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
                    className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <Database size={20} className="text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-100">Clean Build Cache</h2>
                                <p className="text-sm text-slate-400 leading-tight pb-0.5">Free up space used by Docker build processes.</p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={pruning} className="text-slate-500 hover:text-slate-300 disabled:opacity-50">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
                                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-200">Prune Failed</p>
                                    <p className="text-sm text-red-400/80 mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        {result ? (
                            <div className="flex flex-col items-center py-8 gap-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-2">
                                    <CheckCircle2 size={32} className="text-emerald-400" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-slate-100 mb-1">Cache Cleaned</h3>
                                    <p className="text-slate-400">Successfully reclaimed storage space.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 w-full mt-4 flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Space reclaimed</span>
                                    <span className="font-semibold text-emerald-400">{formatSize(result.reclaimedMB)}</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 w-full flex flex-col gap-2 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Current Cache Size</span>
                                        <span className="font-semibold text-slate-200">{formatSize(currentCacheSizeMB)}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-2 border-t border-slate-800 pt-3">
                                        This action asks Docker Engine to clear all unneeded build cache data. Only cache data that is safely removable will be deleted.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50">
                        {result ? (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
                            >
                                Done
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disable:opacity-50"
                                    disabled={pruning}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePrune}
                                    disabled={pruning || currentCacheSizeMB <= 0}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

    const { data: images = [], isLoading: imagesLoading } = useQuery({
        queryKey: ['images'],
        queryFn: imageApi.listImages,
        refetchInterval: 30000,
    });

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['images-usage-summary'],
        queryFn: imageApi.getUsageSummary,
        refetchInterval: 30000,
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

    const imageFilterItems: FilterItem[] = useMemo(() => [
        { key: 'all', label: 'All', count: filterCounts.all, color: 'text-slate-100', activeBg: 'bg-slate-700', activeBorder: 'border-slate-600', icon: <Layers size={16} className="text-slate-400" /> },
        { key: 'ACTIVE', label: 'Active', count: filterCounts.ACTIVE, color: 'text-emerald-400', activeBg: 'bg-emerald-500/20', activeBorder: 'border-emerald-500/50', dot: 'bg-emerald-500 animate-pulse' },
        { key: 'UNUSED', label: 'Unused', count: filterCounts.UNUSED, color: 'text-yellow-400', activeBg: 'bg-yellow-500/20', activeBorder: 'border-yellow-500/50', icon: <AlertTriangle size={16} className="text-yellow-400" /> },
        { key: 'DANGLING', label: 'Dangling', count: filterCounts.DANGLING, color: 'text-red-400', activeBg: 'bg-red-500/20', activeBorder: 'border-red-500/50', icon: <XOctagon size={16} className="text-red-400" /> },
    ], [filterCounts]);

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header onFilterChange={setActiveFilter} activeFilter={activeFilter} filterItems={imageFilterItems} />
            <ResourceNav />
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-200 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-2xl font-bold text-slate-100">Images</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowBuildCacheModal(true)}
                                disabled={isLoading || (summary?.buildCacheMB || 0) === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/25 hover:bg-purple-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Database size={15} />
                                Clean Cache
                            </button>
                            <button
                                onClick={() => setShowPruneModal(true)}
                                disabled={!hasUnused || isLoading}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Sparkles size={15} />
                                Safe Clean Storage
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-slate-500" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Panel */}
                            {summary && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                                    <SummaryCard icon={HardDrive} label="Total Storage" value={formatSize(summary.totalImageStorageMB)} color="bg-blue-600/20" />
                                    <SummaryCard icon={Database} label="Build Cache" value={formatSize(summary.buildCacheMB)} color="bg-purple-600/20" />
                                    <SummaryCard icon={CheckCircle2} label="Active" value={summary.activeImages} color="bg-emerald-600/20" />
                                    <SummaryCard icon={AlertTriangle} label="Unused" value={summary.unusedImages} color="bg-yellow-600/20" />
                                    <SummaryCard icon={XOctagon} label="Dangling" value={summary.danglingImages} color="bg-red-600/20" />
                                </div>
                            )}

                            {/* Image Table */}
                            {filteredImages.length === 0 ? (
                                <div className="text-center py-20">
                                    <Layers size={48} className="mx-auto text-slate-700 mb-4" />
                                    <p className="text-slate-500 text-lg">No images yet</p>
                                    <p className="text-slate-600 text-sm mt-1">Build an image to see it listed here</p>
                                </div>
                            ) : (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-800">
                                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tag</th>
                                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Attached Containers</th>
                                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Used</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredImages.map((image, idx) => (
                                                    <motion.tr
                                                        key={image._id}
                                                        className="border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/30 transition-colors"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: idx * 0.03 }}
                                                        onClick={() => navigate(`/images/${image._id}`)}
                                                    >
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-md bg-slate-700/50 flex items-center justify-center shrink-0">
                                                                    <Layers size={13} className="text-slate-400" />
                                                                </div>
                                                                <span className="font-medium text-slate-200 truncate max-w-[200px]">{image.tag}</span>
                                                                <ChevronRight size={14} className="text-slate-600" />
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-slate-400">
                                                            <span className="flex items-center gap-1.5">
                                                                <HardDrive size={12} className="text-slate-600" />
                                                                {formatSize(image.sizeMB)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <StatusBadge status={image.imageUsageStatus} />
                                                        </td>
                                                        <td className="px-5 py-3.5 text-slate-400">
                                                            {image.attachedContainerIds.length > 0 ? (
                                                                <span className="flex items-center gap-1.5">
                                                                    <Server size={12} className="text-slate-600" />
                                                                    {image.attachedContainerIds.length}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-600">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-slate-500">
                                                            <span className="flex items-center gap-1.5">
                                                                <Clock size={12} className="text-slate-600" />
                                                                {formatDate(image.lastUsedAt)}
                                                            </span>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Prune Modals */}
            {showPruneModal && <PruneModal onClose={() => setShowPruneModal(false)} />}
            {showBuildCacheModal && <PruneBuildCacheModal onClose={() => setShowBuildCacheModal(false)} currentCacheSizeMB={summary?.buildCacheMB || 0} />}
        </div>
    );
};

export default ImagesPage;
