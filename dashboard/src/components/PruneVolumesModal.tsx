import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import {
    HardDrive,
    Loader2,
    X,
    CheckCircle2,
    XOctagon,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { volumeApi } from '../api';
import type { VolumePruneCandidate, VolumePruneResult } from '../api';
import { addToast } from '../store/toastSlice';

function formatSize(mb: number): string {
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
}

interface PruneVolumesModalProps {
    onClose: () => void;
}

const PruneVolumesModal: React.FC<PruneVolumesModalProps> = ({ onClose }) => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const [candidates, setCandidates] = useState<VolumePruneCandidate[]>([]);
    const [totalReclaimableMB, setTotalReclaimableMB] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pruning, setPruning] = useState(false);
    const [result, setResult] = useState<VolumePruneResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch prune preview on mount
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await volumeApi.prunePreview();
                if (cancelled) return;
                setCandidates(data.candidates);
                setTotalReclaimableMB(data.totalReclaimableMB);
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.response?.data?.message || err?.message || 'Failed to load preview');
                }
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
            const res = await volumeApi.pruneUnused();
            setResult(res);
            queryClient.invalidateQueries({ queryKey: ['volumes'] });
            dispatch(addToast({
                message: `Storage cleaned — ${formatSize(res.reclaimedMB)} reclaimed from ${res.prunedCount} volume${res.prunedCount !== 1 ? 's' : ''}`,
                type: 'success',
                duration: 4000,
            }));
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Prune failed';
            setError(message);
            dispatch(addToast({ message, type: 'error', duration: 5000 }));
            // Refresh volumes list on error
            queryClient.invalidateQueries({ queryKey: ['volumes'] });
        } finally {
            setPruning(false);
        }
    }, [dispatch, queryClient]);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!pruning ? onClose : undefined} />

                {/* Panel */}
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
                            <h2 className="text-base font-semibold text-slate-100">Safe Clean Volumes</h2>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={pruning}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800 disabled:opacity-40"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <Loader2 size={24} className="animate-spin text-slate-500" />
                                <p className="text-sm text-slate-500">Scanning for reclaimable volumes…</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center py-8 gap-2">
                                <XOctagon size={28} className="text-red-400" />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        ) : result ? (
                            /* Success state */
                            <div className="flex flex-col items-center py-6 gap-3">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                    <ShieldCheck size={24} className="text-emerald-400" />
                                </div>
                                <p className="text-base font-semibold text-slate-100">
                                    {result.prunedCount > 0 ? 'Storage Cleaned' : 'Nothing to clean'}
                                </p>
                                {result.prunedCount > 0 && (
                                    <p className="text-sm text-emerald-400">
                                        Reclaimed {formatSize(result.reclaimedMB)} from {result.prunedCount} volume
                                        {result.prunedCount !== 1 ? 's' : ''}
                                    </p>
                                )}
                                {result.errors.length > 0 && (
                                    <div className="w-full mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                        <p className="text-xs font-medium text-red-400 mb-1.5">
                                            Partial failures ({result.errors.length})
                                        </p>
                                        {result.errors.map((e, i) => (
                                            <p key={i} className="text-xs text-red-300/80 truncate">
                                                {e.name}: {e.error}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : candidates.length === 0 ? (
                            /* No candidates */
                            <div className="flex flex-col items-center py-8 gap-2">
                                <CheckCircle2 size={28} className="text-emerald-400" />
                                <p className="text-sm text-slate-400">No reclaimable volumes found</p>
                                <p className="text-xs text-slate-600">All volumes are in use</p>
                            </div>
                        ) : (
                            /* Candidate list */
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm text-slate-400">
                                        {candidates.length} volume{candidates.length !== 1 ? 's' : ''} can be removed
                                    </p>
                                    <span className="text-sm font-semibold text-amber-400">
                                        {formatSize(totalReclaimableMB)} reclaimable
                                    </span>
                                </div>
                                <div className="rounded-xl border border-slate-800 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-800 bg-slate-800/40">
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Name</th>
                                                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Size</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {candidates.map(c => (
                                                <tr key={c.id} className="border-b border-slate-800/40 last:border-0">
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <HardDrive size={12} className="text-slate-600 shrink-0" />
                                                            <span className="text-slate-300 font-mono truncate max-w-[240px]">{c.name}</span>
                                                        </div>
                                                    </td>
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
                                    disabled={pruning}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePrune}
                                    disabled={pruning || loading || candidates.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {pruning ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={14} />
                                    )}
                                    {pruning ? 'Cleaning…' : 'Confirm Clean'}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PruneVolumesModal;
