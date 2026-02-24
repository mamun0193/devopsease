import React from 'react';
import { motion } from 'framer-motion';
import { Network, Trash2, Clock } from 'lucide-react';
import type { Network as NetworkType } from '../api';

const STATUS_CONFIG = {
    ACTIVE: {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        label: 'Active',
    },
    UNUSED: {
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        label: 'Unused',
    },
} as const;

function StatusBadge({ status }: { status: 'ACTIVE' | 'UNUSED' }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNUSED;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.color} ${cfg.bg} border ${cfg.border}`}
        >
            {cfg.label}
        </span>
    );
}

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
}

interface NetworkTableProps {
    networks: NetworkType[];
    onDelete: (id: string) => void;
    isDeleting: boolean;
    deletingId: string | null;
}

const NetworkTable: React.FC<NetworkTableProps> = ({
    networks,
    onDelete,
    isDeleting,
    deletingId,
}) => {
    if (networks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Network size={48} className="text-slate-700" />
                <p className="text-slate-500 text-lg">No networks found</p>
                <p className="text-slate-600 text-sm">
                    Networks created by projects will appear here
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Project
                            </th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Created At
                            </th>
                            <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {networks.map((net, idx) => (
                            <motion.tr
                                key={net.id}
                                className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                {/* Name */}
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-md bg-slate-700/50 flex items-center justify-center shrink-0">
                                            <Network size={13} className="text-slate-400" />
                                        </div>
                                        <span className="font-medium text-slate-200 font-mono truncate max-w-[220px]">
                                            {net.name}
                                        </span>
                                    </div>
                                </td>

                                {/* Project */}
                                <td className="px-5 py-3.5 text-slate-400">
                                    {net.projectName ? (
                                        <span className="truncate max-w-[140px] block">{net.projectName}</span>
                                    ) : (
                                        <span className="text-slate-600">—</span>
                                    )}
                                </td>

                                {/* Status */}
                                <td className="px-5 py-3.5">
                                    <StatusBadge status={net.status} />
                                </td>

                                {/* Created At */}
                                <td className="px-5 py-3.5 text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={12} className="text-slate-600 shrink-0" />
                                        {formatDate(net.createdAt)}
                                    </span>
                                </td>

                                {/* Actions */}
                                <td className="px-5 py-3.5 text-right">
                                    <button
                                        onClick={() => onDelete(net.id)}
                                        disabled={net.status === 'ACTIVE' || (isDeleting && deletingId === net.id)}
                                        title={
                                            net.status === 'ACTIVE'
                                                ? 'Cannot delete an active network'
                                                : 'Delete network'
                                        }
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${net.status === 'UNUSED'
                                                ? 'bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20'
                                                : 'bg-slate-800/40 text-slate-600 border border-slate-700/40 cursor-not-allowed'
                                            }
                      disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                        <Trash2 size={12} />
                                        {isDeleting && deletingId === net.id ? 'Deleting…' : 'Delete'}
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default NetworkTable;
