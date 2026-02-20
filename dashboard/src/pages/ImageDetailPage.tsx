import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Layers,
    HardDrive,
    Server,
    Clock,
    Hash,
    Download,
    Box,
    Copy,
    Loader2,
} from 'lucide-react';
import Header from '../components/Header';
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

function DetailField({ icon: Icon, label, children }: { icon?: React.ElementType; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                {Icon && <Icon size={11} />}
                {label}
            </p>
            <div>{children}</div>
        </div>
    );
}

const ImageDetailPage: React.FC = () => {
    const { imageId } = useParams<{ imageId: string }>();
    const navigate = useNavigate();

    const { data: image, isLoading, isError } = useQuery({
        queryKey: ['image', imageId],
        queryFn: () => imageApi.getImage(imageId!),
        enabled: !!imageId,
    });

    const cleanId = image?.dockerImageId?.replace('sha256:', '') || '';

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header />
            <ResourceNav />
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Back + Title */}
                    <div className="flex items-center gap-3 mb-8">
                        <button onClick={() => navigate('/images')} className="text-slate-400 hover:text-slate-200 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                <Layers size={16} className="text-slate-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-100">{image?.tag || 'Loading...'}</h1>
                                {image && <p className="text-xs text-slate-500 mt-0.5">Image Details</p>}
                            </div>
                            {image && <StatusBadge status={image.imageUsageStatus} />}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-slate-500" />
                        </div>
                    ) : isError || !image ? (
                        <div className="text-center py-20">
                            <Layers size={48} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-500 text-lg">Image not found</p>
                            <button
                                onClick={() => navigate('/images')}
                                className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                ← Back to Images
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Overview Card */}
                            <motion.div
                                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-5">Overview</h2>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <DetailField icon={Hash} label="Docker Image ID">
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded font-mono">
                                                {cleanId ? cleanId.substring(0, 16) + '...' : '—'}
                                            </code>
                                            {cleanId && (
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(cleanId)}
                                                    className="text-slate-600 hover:text-slate-400 transition-colors"
                                                    title="Copy full ID"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </DetailField>

                                    <DetailField icon={HardDrive} label="Size">
                                        <p className="text-sm font-semibold text-slate-200">{formatSize(image.sizeMB)}</p>
                                    </DetailField>

                                    <DetailField icon={Layers} label="Layers">
                                        <p className="text-sm font-semibold text-slate-200">{image.layerCount}</p>
                                    </DetailField>

                                    <DetailField label="Status">
                                        <StatusBadge status={image.imageUsageStatus} />
                                    </DetailField>
                                </div>
                            </motion.div>

                            {/* Usage & Source Card */}
                            <motion.div
                                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                            >
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-5">Usage & Source</h2>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <DetailField icon={Download} label="Pull Count">
                                        <p className="text-sm font-semibold text-slate-200">{image.pullCount ?? 0}</p>
                                    </DetailField>

                                    <DetailField icon={Box} label="Source">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${(image.pulledFrom || 'DOCKERFILE') === 'DOCKERFILE'
                                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                            }`}>
                                            {image.pulledFrom || 'DOCKERFILE'}
                                        </span>
                                    </DetailField>

                                    <DetailField icon={Clock} label="Created">
                                        <p className="text-sm text-slate-300">{formatDate(image.createdAt)}</p>
                                    </DetailField>

                                    <DetailField icon={Clock} label="Last Used">
                                        <p className="text-sm text-slate-300">{formatDate(image.lastUsedAt)}</p>
                                    </DetailField>
                                </div>
                            </motion.div>

                            {/* Attached Containers Card */}
                            <motion.div
                                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-5 flex items-center gap-2">
                                    <Server size={14} />
                                    Attached Containers
                                    <span className="text-xs text-slate-600 font-normal">({image.attachedContainerIds.length})</span>
                                </h2>
                                {image.attachedContainerIds.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {image.attachedContainerIds.map((cid) => (
                                            <code
                                                key={cid}
                                                className="text-xs text-slate-300 bg-slate-700/50 border border-slate-700 px-3 py-1.5 rounded-lg font-mono hover:bg-slate-700 transition-colors cursor-default"
                                            >
                                                {cid.substring(0, 12)}
                                            </code>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-600">No containers attached to this image</p>
                                )}
                            </motion.div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ImageDetailPage;
