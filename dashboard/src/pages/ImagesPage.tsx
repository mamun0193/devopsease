import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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

const ImagesPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState<ImageFilter>('all');

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
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-200 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-bold text-slate-100">Images</h1>
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
        </div>
    );
};

export default ImagesPage;
