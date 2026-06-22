import React from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Server } from 'lucide-react';
import type { Volume } from '../api';

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
    PENDING_DELETE: {
        color: 'text-dds-red',
        bg: 'bg-dds-red/10',
        border: 'border-dds-red/30',
        label: 'Pending Delete',
    },
} as const;

function StatusBadge({ status }: { status: Volume['status'] }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNUSED;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono tracking-wide ${cfg.color} ${cfg.bg} border ${cfg.border}`}
        >
            {cfg.label}
        </span>
    );
}

function formatSize(mb: number): string {
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
}

interface VolumeTableProps {
    volumes: Volume[];
}

const VolumeTable: React.FC<VolumeTableProps> = ({ volumes }) => {
    if (volumes.length === 0) {
        return (
            <div className="card flex flex-col items-center justify-center py-20 gap-3">
                <HardDrive size={40} className="text-dds-text-muted" />
                <p className="text-dds-text-primary text-[14px] font-medium">No volumes found</p>
                <p className="text-dds-text-secondary text-[13px]">
                    Named volumes created by projects will appear here
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
                                Size
                            </th>
                            <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">
                                Attached
                            </th>
                            <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-5 py-3.5 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">
                                Project
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {volumes.map((vol, idx) => (
                            <motion.tr
                                key={vol.id}
                                className="border-b border-dds-border last:border-0 hover:bg-dds-muted/50 transition-colors"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-md bg-dds-muted flex items-center justify-center shrink-0">
                                            <HardDrive size={13} className="text-dds-text-muted" />
                                        </div>
                                        <span className="text-[13px] font-medium text-dds-text-primary max-w-[200px] truncate">
                                            {vol.name}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-5 py-3.5">
                                    <span className="flex items-center gap-1.5 text-[12px] font-mono text-dds-text-secondary">
                                        <HardDrive size={12} className="text-dds-text-muted shrink-0" />
                                        {formatSize(vol.sizeMB)}
                                    </span>
                                </td>

                                <td className="px-5 py-3.5">
                                    {vol.attachedContainerIds.length > 0 ? (
                                        <span className="flex items-center gap-1.5 text-[12px] font-mono text-dds-text-secondary">
                                            <Server size={12} className="text-dds-text-muted shrink-0" />
                                            {vol.attachedContainerIds.length}
                                        </span>
                                    ) : (
                                        <span className="text-[13px] text-dds-text-muted">—</span>
                                    )}
                                </td>

                                <td className="px-5 py-3.5">
                                    <StatusBadge status={vol.status} />
                                </td>

                                <td className="px-5 py-3.5">
                                    {vol.projectId ? (
                                        <span className="text-[13px] text-dds-text-secondary truncate max-w-[140px] block">{vol.projectId}</span>
                                    ) : (
                                        <span className="text-[13px] text-dds-text-muted">—</span>
                                    )}
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VolumeTable;
