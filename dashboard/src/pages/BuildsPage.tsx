import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Hammer,
    Clock,
    CheckCircle2,
    XCircle,
    Timer,
    Loader2,
    HardDrive,
    Layers,
    Plus,
    ChevronRight,
    Trash2,
    Trash
} from 'lucide-react';
import { useBuilds, useTriggerBuild, useDeleteBuild, useDeleteAllBuilds } from '../hooks/useBuilds';
import CacheAnalyticsPanel from '../components/builds/CacheAnalyticsPanel';
import ConfirmModal from '../components/ConfirmModal';
import type { Build } from '../api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    pending: { color: 'text-dds-yellow', bg: 'bg-dds-yellow/10', border: 'border-dds-yellow/30', icon: <Clock size={12} />, label: 'Pending' },
    running: { color: 'text-dds-blue', bg: 'bg-dds-blue/10', border: 'border-dds-blue/30', icon: <Loader2 size={12} className="animate-spin" />, label: 'Building' },
    success: { color: 'text-dds-green', bg: 'bg-dds-green/10', border: 'border-dds-green/30', icon: <CheckCircle2 size={12} />, label: 'Success' },
    failed: { color: 'text-dds-red', bg: 'bg-dds-red/10', border: 'border-dds-red/30', icon: <XCircle size={12} />, label: 'Failed' },
    timeout: { color: 'text-dds-orange', bg: 'bg-dds-orange/10', border: 'border-dds-orange/30', icon: <Timer size={12} />, label: 'Timeout' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono tracking-wide ${config.color} ${config.bg} border ${config.border}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

function formatDuration(start?: string, end?: string): string {
    if (!start) return '—';
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const seconds = Math.round((e - s) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function formatSize(bytes?: number): string {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

function BuildRow({ build, onClick, onDelete }: { build: Build; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
    return (
        <tr
            onClick={onClick}
            className="group border-b border-dds-border last:border-0 hover:bg-dds-muted/50 cursor-pointer transition-colors"
        >
            <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                    <Hammer size={16} className="text-dds-text-muted" />
                    <div>
                        <div className="text-[13px] font-medium text-dds-text-primary group-hover:text-white transition-colors">
                            {build.tag}
                        </div>
                        <div className="text-[11px] font-mono text-dds-text-secondary">
                            {new Date(build.createdAt).toLocaleString()}
                        </div>
                    </div>
                </div>
            </td>
            <td className="py-3 px-4">
                <StatusBadge status={build.status} />
            </td>
            <td className="py-3 px-4">
                <span className="text-[12px] font-mono text-dds-text-secondary flex items-center gap-1.5">
                    <Clock size={12} className="text-dds-text-muted" />
                    {formatDuration(build.startedAt, build.completedAt)}
                </span>
            </td>
            <td className="py-3 px-4">
                {build.imageSizeBytes ? (
                    <span className="text-[12px] font-mono text-dds-text-secondary flex items-center gap-1.5">
                        <HardDrive size={12} className="text-dds-text-muted" />
                        {formatSize(build.imageSizeBytes)}
                    </span>
                ) : <span className="text-dds-text-muted">—</span>}
            </td>
            <td className="py-3 px-4">
                {build.layerCount ? (
                    <span className="text-[12px] font-mono text-dds-text-secondary flex items-center gap-1.5">
                        <Layers size={12} className="text-dds-text-muted" />
                        {build.layerCount}
                    </span>
                ) : <span className="text-dds-text-muted">—</span>}
            </td>
            <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(e);
                        }}
                        className="p-1.5 rounded text-dds-text-muted hover:text-dds-red hover:bg-dds-red/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Build"
                    >
                        <Trash size={15} />
                    </button>
                    <ChevronRight size={16} className="text-dds-text-muted group-hover:text-dds-text-primary transition-colors" />
                </div>
            </td>
        </tr>
    );
}

const BuildsPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: builds = [], isLoading } = useBuilds();
    const triggerBuild = useTriggerBuild();

    const [showForm, setShowForm] = useState(false);
    const [tag, setTag] = useState('');
    const [dockerfile, setDockerfile] = useState('FROM alpine:latest\nRUN echo "Hello from DevOpsEase"');
    const [formError, setFormError] = useState('');
    
    const [deleteBuildId, setDeleteBuildId] = useState<string | null>(null);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const deleteBuild = useDeleteBuild();
    const deleteAllBuilds = useDeleteAllBuilds();

    const handleDeleteBuild = async () => {
        if (!deleteBuildId) return;
        try {
            await deleteBuild.mutateAsync(deleteBuildId);
            setDeleteBuildId(null);
        } catch (err) {
            console.error('Failed to delete build', err);
        }
    };

    const handleDeleteAll = async () => {
        try {
            await deleteAllBuilds.mutateAsync();
            setShowDeleteAllConfirm(false);
        } catch (err) {
            console.error('Failed to delete all builds', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!tag.trim()) { setFormError('Tag is required'); return; }
        if (!dockerfile.trim()) { setFormError('Dockerfile content is required'); return; }

        try {
            const result = await triggerBuild.mutateAsync({ tag: tag.trim(), dockerfile });
            setShowForm(false);
            setTag('');
            navigate(`/builds/${result.buildId}`);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err.message || 'Build failed';
            setFormError(msg);
        }
    };

    return (
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Hammer size={24} className="text-dds-text-primary" />
                            <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Image Builds</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {builds.length > 0 && (
                                <button
                                    onClick={() => setShowDeleteAllConfirm(true)}
                                    className="btn-secondary flex items-center gap-2 border-dds-red/30 text-dds-red hover:bg-dds-red/10"
                                >
                                    <Trash2 size={16} />
                                    Remove All
                                </button>
                            )}
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus size={16} />
                                New Build
                            </button>
                        </div>
                    </div>

                    <CacheAnalyticsPanel />

                    {/* Build Form */}
                    <AnimatePresence>
                        {showForm && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                                onSubmit={handleSubmit}
                            >
                                <div className="card p-6 space-y-5">
                                    <div>
                                        <label className="block text-[13px] font-medium text-dds-text-primary mb-1.5">Image Tag</label>
                                        <input
                                            type="text"
                                            value={tag}
                                            onChange={(e) => setTag(e.target.value)}
                                            placeholder="e.g. my-app:v1.0"
                                            className="input"
                                            maxLength={128}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-medium text-dds-text-primary mb-1.5">Dockerfile</label>
                                        <textarea
                                            value={dockerfile}
                                            onChange={(e) => setDockerfile(e.target.value)}
                                            rows={10}
                                            className="input font-mono text-[13px] resize-y"
                                            placeholder="FROM ubuntu:latest&#10;RUN apt-get update"
                                            spellCheck={false}
                                        />
                                    </div>

                                    {formError && (
                                        <div className="flex items-start gap-2 text-[13px] text-dds-red bg-dds-red/10 border border-dds-red/20 rounded-md p-3">
                                            <XCircle size={14} className="mt-0.5 shrink-0" />
                                            {formError}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="submit"
                                            disabled={triggerBuild.isPending}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            {triggerBuild.isPending ? (
                                                <><Loader2 size={14} className="animate-spin" /> Starting…</>
                                            ) : (
                                                <><Hammer size={14} /> Build Image</>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowForm(false); setFormError(''); }}
                                            className="btn-secondary"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Build List */}
                    <div className="card overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                            </div>
                        ) : builds.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Hammer size={40} className="text-dds-text-muted mb-4" />
                                <h3 className="text-lg font-medium text-dds-text-primary mb-1">No builds yet</h3>
                                <p className="text-sm text-dds-text-secondary max-w-sm">
                                    Create your first image build to get started
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b border-dds-border bg-dds-muted/50">
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Image Tag</th>
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Status</th>
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Duration</th>
                                            <th className="text-left text-[11px] font-semibold text-dds-text-secondary uppercase tracking-wider py-4 px-4 hidden lg:table-cell w-20">Size</th>
                                            <th className="text-left text-[11px] font-semibold text-dds-text-secondary uppercase tracking-wider py-4 px-4 hidden sm:table-cell w-20">Layers</th>
                                            <th className="py-4 px-4 w-20 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dds-border">
                                        {builds.map(build => (
                                            <BuildRow 
                                                key={build._id} 
                                                build={build} 
                                                onClick={() => navigate(`/builds/${build._id}`)} 
                                                onDelete={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteBuildId(build._id);
                                                }}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <ConfirmModal
                isOpen={!!deleteBuildId}
                onClose={() => setDeleteBuildId(null)}
                onConfirm={handleDeleteBuild}
                title="Remove Build"
                message="Are you sure you want to remove this build history? The actual image will remain in the registry."
                confirmLabel="Remove Build"
                isDangerous={true}
            />

            <ConfirmModal
                isOpen={showDeleteAllConfirm}
                onClose={() => setShowDeleteAllConfirm(false)}
                onConfirm={handleDeleteAll}
                title="Remove All Builds"
                message="Are you sure you want to remove all build histories? This action cannot be undone."
                confirmLabel="Remove All"
                isDangerous={true}
            />
        </div>
    );
};

export default BuildsPage;
