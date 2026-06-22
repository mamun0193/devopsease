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
                    className="relative w-full max-w-lg mx-4 bg-dds-bg border border-dds-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-dds-border bg-dds-surface/50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shadow-inner">
                                <Sparkles size={18} className="text-amber-400" />
                            </div>
                            <h2 className="text-base font-semibold text-dds-text-primary">Safe Clean Volumes</h2>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={pruning}
                            className="text-dds-text-muted hover:text-dds-white transition-colors p-1.5 rounded-lg hover:bg-dds-surface disabled:opacity-50"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                                <p className="text-[13px] text-dds-text-muted">Scanning for reclaimable volumes…</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center py-8 gap-2">
                                <XOctagon size={28} className="text-dds-red" />
                                <p className="text-[13px] text-dds-red">{error}</p>
                            </div>
                        ) : result ? (
                            /* Success state */
                            <div className="flex flex-col items-center py-6 gap-3">
                                <div className="w-12 h-12 rounded-full bg-dds-green/10 flex items-center justify-center border border-dds-green/20 shadow-inner">
                                    <ShieldCheck size={24} className="text-dds-green" />
                                </div>
                                <p className="text-base font-semibold text-dds-text-primary mt-2">
                                    {result.prunedCount > 0 ? 'Storage Cleaned' : 'Nothing to clean'}
                                </p>
                                {result.prunedCount > 0 && (
                                    <p className="text-[13px] text-dds-green">
                                        Reclaimed {formatSize(result.reclaimedMB)} from {result.prunedCount} volume
                                        {result.prunedCount !== 1 ? 's' : ''}
                                    </p>
                                )}
                                {result.errors.length > 0 && (
                                    <div className="w-full mt-4 bg-dds-red/10 border border-dds-red/30 rounded-md p-4">
                                        <p className="text-[11px] font-mono font-medium text-dds-red uppercase tracking-wider mb-2">
                                            Partial failures ({result.errors.length})
                                        </p>
                                        {result.errors.map((e, i) => (
                                            <p key={i} className="text-[13px] text-dds-red/80 truncate mb-1 last:mb-0">
                                                <span className="font-medium">{e.name}:</span> {e.error}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : candidates.length === 0 ? (
                            /* No candidates */
                            <div className="flex flex-col items-center py-10 gap-3">
                                <CheckCircle2 size={32} className="text-dds-green" />
                                <p className="text-[13px] text-dds-text-primary font-medium mt-1">No reclaimable volumes found</p>
                                <p className="text-[11px] text-dds-text-muted">All volumes are currently in use</p>
                            </div>
                        ) : (
                            /* Candidate list */
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[13px] text-dds-text-secondary">
                                        {candidates.length} volume{candidates.length !== 1 ? 's' : ''} can be removed
                                    </p>
                                    <span className="text-[13px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                        {formatSize(totalReclaimableMB)} reclaimable
                                    </span>
                                </div>
                                <div className="rounded-md border border-dds-border overflow-hidden bg-dds-surface">
                                    <table className="w-full text-[13px]">
                                        <thead>
                                            <tr className="border-b border-dds-border bg-dds-surface/80">
                                                <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">Name</th>
                                                <th className="text-right px-4 py-3 text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">Size</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {candidates.map(c => (
                                                <tr key={c.id} className="border-b border-dds-border/50 last:border-0 hover:bg-dds-surface/60 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <HardDrive size={13} className="text-dds-text-muted shrink-0" />
                                                            <span className="text-dds-text-primary font-mono truncate max-w-[240px] text-[12px]">{c.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-dds-text-secondary font-mono text-[12px]">{formatSize(c.sizeMB)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-dds-border bg-dds-surface/50 mt-auto">
                        {result ? (
                            <button
                                onClick={onClose}
                                className="btn-secondary px-6"
                            >
                                Done
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    disabled={pruning}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePrune}
                                    disabled={pruning || loading || candidates.length === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-md text-[13px] font-medium bg-amber-400/10 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
