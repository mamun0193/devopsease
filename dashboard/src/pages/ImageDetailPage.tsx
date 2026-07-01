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
    Activity,
    GitCommit,
    TerminalSquare,
    Upload,
} from 'lucide-react';
import { imageApi } from '../api';

const STATUS_CONFIG: Record<string, { badgeClass: string; label: string }> = {
    BUILDING: { badgeClass: 'badge badge-queued', label: 'Building' },
    READY: { badgeClass: 'badge badge-success', label: 'Ready' },
    DEPLOYED: { badgeClass: 'badge badge-running', label: 'Deployed' },
    PUSHED: { badgeClass: 'badge badge-warning', label: 'Pushed' },
    ARCHIVED: { badgeClass: 'badge badge-warning', label: 'Archived' },
    DELETED: { badgeClass: 'badge badge-failed', label: 'Deleted' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.READY;
    return (
        <span className={config.badgeClass}>
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
        <div className="space-y-2">
            <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                {Icon && <Icon size={12} />}
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
        <div className="min-h-screen flex flex-col bg-dds-bg">
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Back + Title */}
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => navigate('/images')} className="text-dds-text-secondary hover:text-dds-white transition-colors p-1.5 rounded-lg hover:bg-dds-surface">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-dds-surface border border-dds-border flex items-center justify-center shadow-sm">
                                <Layers size={18} className="text-dds-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-semibold text-dds-text-primary">{image?.tag || 'Loading...'}</h1>
                                {image && <p className="text-[12px] font-mono text-dds-text-muted mt-0.5">Image Details</p>}
                            </div>
                            {image && <StatusBadge status={image.lifecycleStatus || 'READY'} />}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 size={24} className="animate-spin text-dds-primary" />
                            <p className="text-sm font-medium text-dds-text-muted">Loading image details...</p>
                        </div>
                    ) : isError || !image ? (
                        <div className="text-center py-20 bg-dds-surface/50 border border-dds-border rounded-xl">
                            <Layers size={48} className="mx-auto text-dds-text-muted mb-4" />
                            <p className="text-dds-text-primary font-medium text-sm mb-4">Image not found</p>
                            <button
                                onClick={() => navigate('/images')}
                                className="btn-primary inline-flex"
                            >
                                <ArrowLeft size={16} className="mr-1.5" />
                                Back to Images
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Overview Card */}
                                <motion.div
                                    className="bg-dds-surface border border-dds-border rounded-xl p-6 shadow-sm"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Hash size={14} /> Identity & Intelligence
                                    </h2>
                                    <div className="grid grid-cols-2 gap-6">
                                        <DetailField label="Docker Image ID">
                                            <div className="flex items-center gap-2">
                                                <code className="text-[12px] text-dds-text-primary bg-dds-bg border border-dds-border/50 px-2 py-1 rounded font-mono">
                                                    {cleanId ? cleanId.substring(0, 16) + '...' : '—'}
                                                </code>
                                                {cleanId && (
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(cleanId)}
                                                        className="text-dds-text-muted hover:text-dds-white transition-colors p-1"
                                                        title="Copy full ID"
                                                    >
                                                        <Copy size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </DetailField>

                                        <DetailField icon={HardDrive} label="Size & Layers">
                                            <p className="text-[13px] font-mono font-medium text-dds-text-primary">{formatSize(image.sizeMB)} / {image.layerCount} layers</p>
                                        </DetailField>

                                        <DetailField icon={TerminalSquare} label="Runtime & OS">
                                            <p className="text-[13px] font-medium text-dds-text-primary capitalize">{image.runtime || 'Unknown'} / {image.os || 'Unknown'}</p>
                                        </DetailField>

                                        <DetailField icon={GitCommit} label="Language / Framework">
                                            <p className="text-[13px] font-medium text-dds-text-primary">
                                                {image.language || 'N/A'} {image.framework ? `(${image.framework})` : ''}
                                            </p>
                                        </DetailField>
                                    </div>
                                </motion.div>

                                {/* Registry Card */}
                                {image.registry?.provider && (
                                    <motion.div
                                        className="bg-dds-surface border border-dds-border rounded-xl p-6 shadow-sm"
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 }}
                                    >
                                        <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                                            <Upload size={14} /> Registry Info
                                        </h2>
                                        <div className="grid grid-cols-2 gap-6">
                                            <DetailField label="Provider">
                                                <p className="text-[13px] font-medium text-dds-text-primary">{image.registry.provider}</p>
                                            </DetailField>

                                            <DetailField label="Pushed Target">
                                                <p className="text-[13px] font-mono text-dds-text-secondary">{image.registry.repository}:{image.registry.pushedTag}</p>
                                            </DetailField>
                                            
                                            <DetailField label="Pushed At">
                                                <p className="text-[13px] font-mono text-dds-text-secondary">{formatDate(image.registry.pushTimestamp?.toString() || null)}</p>
                                            </DetailField>
                                            
                                            <DetailField label="Digest">
                                                <p className="text-[13px] font-mono text-dds-text-secondary truncate max-w-[200px]" title={image.registry.pushedDigest || undefined}>
                                                    {image.registry.pushedDigest || '—'}
                                                </p>
                                            </DetailField>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Attached Containers Card */}
                                <motion.div
                                    className="bg-dds-surface border border-dds-border rounded-xl p-6 shadow-sm"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Server size={14} />
                                        Attached Containers
                                        <span className="text-[10px] text-dds-text-muted font-normal bg-dds-bg px-1.5 py-0.5 rounded">
                                            {image.attachedContainerIds.length}
                                        </span>
                                    </h2>
                                    {image.attachedContainerIds.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {image.attachedContainerIds.map((cid: string) => (
                                                <code
                                                    key={cid}
                                                    className="text-[12px] text-dds-text-primary bg-dds-bg border border-dds-border/50 px-2 py-1 rounded font-mono cursor-default"
                                                >
                                                    {cid.substring(0, 12)}
                                                </code>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[13px] text-dds-text-muted italic">No containers attached to this image</p>
                                    )}
                                </motion.div>
                            </div>

                            {/* Sidebar / Timeline */}
                            <div className="space-y-6">
                                <motion.div
                                    className="bg-dds-surface border border-dds-border rounded-xl p-6 shadow-sm"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 }}
                                >
                                    <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Activity size={14} /> Event Timeline
                                    </h2>
                                    
                                    {/* Timeline placeholder - will need API endpoint for fetching history later */}
                                    <div className="relative border-l border-dds-border/50 ml-3 space-y-6">
                                        <div className="relative pl-6">
                                            <span className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-dds-blue ring-4 ring-dds-surface"></span>
                                            <p className="text-[13px] font-medium text-dds-text-primary">Image Created</p>
                                            <p className="text-[11px] text-dds-text-muted font-mono mt-1">{formatDate(image.createdAt)}</p>
                                        </div>
                                        <div className="relative pl-6">
                                            <span className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-dds-text-muted ring-4 ring-dds-surface"></span>
                                            <p className="text-[13px] font-medium text-dds-text-primary">Last Used</p>
                                            <p className="text-[11px] text-dds-text-muted font-mono mt-1">{formatDate(image.lastUsedAt)}</p>
                                        </div>
                                    </div>
                                    
                                </motion.div>
                                
                                <motion.div
                                    className="bg-dds-surface border border-dds-border rounded-xl p-6 shadow-sm"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Box size={14} /> Lineage
                                    </h2>
                                    <div className="space-y-4">
                                        <DetailField label="Build Pipeline">
                                            {image.buildId ? (
                                                <button onClick={() => navigate(`/builds/${image.buildId}`)} className="text-[13px] text-dds-blue hover:underline font-mono">
                                                    {image.buildId.substring(0, 8)}
                                                </button>
                                            ) : (
                                                <p className="text-[13px] text-dds-text-muted italic">No build associated</p>
                                            )}
                                        </DetailField>
                                        
                                        <DetailField label="Repository">
                                            {image.repoId ? (
                                                <button onClick={() => navigate(`/projects/${image.repoId}`)} className="text-[13px] text-dds-blue hover:underline font-mono">
                                                    {image.repoId.substring(0, 8)}
                                                </button>
                                            ) : (
                                                <p className="text-[13px] text-dds-text-muted italic">No repository associated</p>
                                            )}
                                        </DetailField>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ImageDetailPage;
