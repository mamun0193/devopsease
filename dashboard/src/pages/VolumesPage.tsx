import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, CheckCircle2, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import VolumeTable from '../components/VolumeTable';
import PruneVolumesModal from '../components/PruneVolumesModal';
import { useVolumes } from '../hooks/useVolumes';

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

function formatSize(mb: number): string {
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
}

const VolumesPage: React.FC = () => {
    const { data: volumes = [], isLoading } = useVolumes();
    const [showPruneModal, setShowPruneModal] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('all');

    const summary = useMemo(() => {
        const totalMB = volumes.reduce((acc, v) => acc + (v.sizeMB || 0), 0);
        return {
            totalMB,
            total: volumes.length,
            active: volumes.filter(v => v.status === 'ACTIVE').length,
            unused: volumes.filter(v => v.status === 'UNUSED').length,
        };
    }, [volumes]);

    const filteredVolumes = useMemo(() => {
        switch (activeFilter) {
            case 'active': return volumes.filter(v => v.status === 'ACTIVE');
            case 'unused': return volumes.filter(v => v.status === 'UNUSED');
            default:       return volumes;
        }
    }, [volumes, activeFilter]);

    const hasUnused = summary.unused > 0;

    return (
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <HardDrive size={24} className="text-dds-text-primary" />
                            <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Volumes</h1>
                        </div>
                        <button
                            onClick={() => setShowPruneModal(true)}
                            disabled={!hasUnused || isLoading}
                            className="btn-secondary"
                        >
                            <Sparkles size={15} className="text-dds-orange" />
                            Safe Clean Volumes
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <SummaryCard
                                    icon={HardDrive}
                                    label="Total Storage"
                                    value={formatSize(summary.totalMB)}
                                    color="bg-dds-blue"
                                />
                                <SummaryCard
                                    icon={CheckCircle2}
                                    label="Active"
                                    value={summary.active}
                                    color="bg-dds-green"
                                />
                                <SummaryCard
                                    icon={AlertTriangle}
                                    label="Unused"
                                    value={summary.unused}
                                    color="bg-dds-yellow"
                                />
                            </div>

                            <VolumeTable volumes={filteredVolumes} />
                        </>
                    )}
                </div>
            </main>

            {showPruneModal && <PruneVolumesModal onClose={() => setShowPruneModal(false)} />}
        </div>
    );
};

export default VolumesPage;
