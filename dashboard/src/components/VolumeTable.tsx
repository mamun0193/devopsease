import React from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Server } from 'lucide-react';
import type { Volume } from '../api';

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
    PENDING_DELETE: {
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        label: 'Pending Delete',
    },
} as const;

function StatusBadge({ status }: { status: Volume['status'] }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNUSED;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.color} ${cfg.bg} border ${cfg.border}`}
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
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <HardDrive size={48} className="text-slate-700" />
                <p className="text-slate-500 text-lg">No volumes found</p>
                <p className="text-slate-600 text-sm">
                    Named volumes created by projects will appear here
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
                                Size
                            </th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Attached
                            </th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Project
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {volumes.map((vol, idx) => (
                            <motion.tr
                                key={vol.id}
                                className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                {/* Name */}
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-md bg-slate-700/50 flex items-center justify-center shrink-0">
                                            <HardDrive size={13} className="text-slate-400" />
                                        </div>
                                        <span className="font-medium text-slate-200 font-mono truncate max-w-[200px]">
                                            {vol.name}
                                        </span>
                                    </div>
                                </td>

                                {/* Size */}
                                <td className="px-5 py-3.5 text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <HardDrive size={12} className="text-slate-600 shrink-0" />
                                        {formatSize(vol.sizeMB)}
                                    </span>
                                </td>

                                {/* Attached containers */}
                                <td className="px-5 py-3.5 text-slate-400">
                                    {vol.attachedContainerIds.length > 0 ? (
                                        <span className="flex items-center gap-1.5">
                                            <Server size={12} className="text-slate-600 shrink-0" />
                                            {vol.attachedContainerIds.length}
                                        </span>
                                    ) : (
                                        <span className="text-slate-600">—</span>
                                    )}
                                </td>

                                {/* Status */}
                                <td className="px-5 py-3.5">
                                    <StatusBadge status={vol.status} />
                                </td>

                                {/* Project */}
                                <td className="px-5 py-3.5 text-slate-400">
                                    {vol.projectId ? (
                                        <span className="truncate max-w-[140px] block">{vol.projectId}</span>
                                    ) : (
                                        <span className="text-slate-600">—</span>
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
