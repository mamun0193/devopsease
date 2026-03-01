import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import type { FilterItem } from '../components/Header';
import ResourceNav from '../components/ResourceNav';
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

function formatSize(mb: number): string {
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
}

const VolumesPage: React.FC = () => {
    const navigate = useNavigate();
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

    const filterItems: FilterItem[] = useMemo(() => [
        {
            key: 'all',
            label: 'Total',
            count: summary.total,
            color: 'text-slate-300',
            activeBg: 'bg-slate-700',
            activeBorder: 'border-slate-600',
            icon: <HardDrive size={14} className="text-slate-400" />,
        },
        {
            key: 'active',
            label: 'Active',
            count: summary.active,
            color: 'text-emerald-400',
            activeBg: 'bg-emerald-500/20',
            activeBorder: 'border-emerald-500/50',
            dot: 'bg-emerald-500',
        },
        {
            key: 'unused',
            label: 'Unused',
            count: summary.unused,
            color: 'text-yellow-400',
            activeBg: 'bg-yellow-500/20',
            activeBorder: 'border-yellow-500/50',
            icon: <AlertTriangle size={14} className="text-yellow-400" />,
        },
    ], [summary]);

    const hasUnused = summary.unused > 0;

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header onFilterChange={setActiveFilter} activeFilter={activeFilter} filterItems={filterItems} />
            <ResourceNav />

            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-2xl font-bold text-slate-100">Volumes</h1>
                        </div>
                        <button
                            onClick={() => setShowPruneModal(true)}
                            disabled={!hasUnused || isLoading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Sparkles size={15} />
                            Safe Clean Volumes
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-slate-500" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                                <SummaryCard
                                    icon={HardDrive}
                                    label="Total Storage"
                                    value={formatSize(summary.totalMB)}
                                    color="bg-blue-600/20"
                                />
                                <SummaryCard
                                    icon={CheckCircle2}
                                    label="Active"
                                    value={summary.active}
                                    color="bg-emerald-600/20"
                                />
                                <SummaryCard
                                    icon={AlertTriangle}
                                    label="Unused"
                                    value={summary.unused}
                                    color="bg-yellow-600/20"
                                />
                            </div>

                            {/* Table */}
                            <VolumeTable volumes={filteredVolumes} />
                        </>
                    )}
                </div>
            </main>

            {/* Prune Modal */}
            {showPruneModal && <PruneVolumesModal onClose={() => setShowPruneModal(false)} />}
        </div>
    );
};

export default VolumesPage;
