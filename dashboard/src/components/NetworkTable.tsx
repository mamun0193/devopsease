import React from 'react';
import { motion } from 'framer-motion';
import { Network, Trash2, Clock } from 'lucide-react';
import type { Network as NetworkType } from '../api';

const STATUS_CONFIG = {
    ACTIVE: {
        color: 'text-dds-green',
        bg: 'bg-dds-green/10',
        border: 'border-dds-green/30',
        label: 'Active',
    },
    UNUSED: {
        color: 'text-dds-yellow',
        bg: 'bg-dds-yellow/10',
        border: 'border-dds-yellow/30',
        label: 'Unused',
    },
} as const;

function StatusBadge({ status }: { status: 'ACTIVE' | 'UNUSED' }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNUSED;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono tracking-wide ${cfg.color} ${cfg.bg} border ${cfg.border}`}
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
            <div className="card flex flex-col items-center justify-center py-20 gap-3">
                <Network size={40} className="text-dds-text-muted" />
                <p className="text-dds-text-primary text-[14px] font-medium">No networks found</p>
                <p className="text-dds-text-secondary text-[13px]">
                    Networks created by projects will appear here
                </p>
            </div>
        );
    }

    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                        <tr className="border-b border-dds-border bg-dds-muted/50">
                            <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">
                                Project
                            </th>
                            <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">
                                Created At
                            </th>
                            <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {networks.map((net, idx) => (
                            <motion.tr
                                key={net.id}
                                className="border-b border-dds-border last:border-0 hover:bg-dds-muted/50 transition-colors"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-md bg-dds-muted flex items-center justify-center shrink-0">
                                            <Network size={13} className="text-dds-text-muted" />
                                        </div>
                                        <span className="text-[13px] font-medium text-dds-text-primary max-w-[220px] truncate">
                                            {net.name}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-5 py-3.5">
                                    {net.projectName ? (
                                        <span className="text-[13px] text-dds-text-secondary truncate max-w-[140px] block">{net.projectName}</span>
                                    ) : (
                                        <span className="text-[13px] text-dds-text-muted">—</span>
                                    )}
                                </td>

                                <td className="px-5 py-3.5">
                                    <StatusBadge status={net.status} />
                                </td>

                                <td className="px-5 py-3.5">
                                    <span className="flex items-center gap-1.5 text-[12px] font-mono text-dds-text-secondary">
                                        <Clock size={12} className="text-dds-text-muted shrink-0" />
                                        {formatDate(net.createdAt)}
                                    </span>
                                </td>

                                <td className="px-5 py-3.5 text-right">
                                    <button
                                        onClick={() => onDelete(net.id)}
                                        disabled={net.status === 'ACTIVE' || (isDeleting && deletingId === net.id)}
                                        title={
                                            net.status === 'ACTIVE'
                                                ? 'Cannot delete an active network'
                                                : 'Delete network'
                                        }
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all
                      ${net.status === 'UNUSED'
                                                ? 'bg-dds-red/10 text-dds-red hover:bg-dds-red/20'
                                                : 'bg-dds-muted/50 text-dds-text-muted cursor-not-allowed'
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
