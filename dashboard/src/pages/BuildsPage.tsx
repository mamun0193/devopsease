import React, { useState } from 'react';
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
    ArrowLeft,
} from 'lucide-react';
import Header from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import { useBuilds, useTriggerBuild } from '../hooks/useBuilds';
import type { Build } from '../api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    PENDING: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <Clock size={14} />, label: 'Pending' },
    RUNNING: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <Loader2 size={14} className="animate-spin" />, label: 'Building' },
    SUCCESS: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <CheckCircle2 size={14} />, label: 'Success' },
    FAILED: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <XCircle size={14} />, label: 'Failed' },
    TIMEOUT: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <Timer size={14} />, label: 'Timeout' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color} ${config.bg} border ${config.border}`}>
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

function BuildRow({ build, onClick }: { build: Build; onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 transition-all group"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.005 }}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
                        <Hammer size={16} className="text-slate-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">{build.tag}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(build.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <StatusBadge status={build.status} />

                    <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDuration(build.startedAt, build.completedAt)}
                        </span>
                        {build.imageSizeBytes ? (
                            <span className="flex items-center gap-1">
                                <HardDrive size={12} />
                                {formatSize(build.imageSizeBytes)}
                            </span>
                        ) : null}
                        {build.layerCount ? (
                            <span className="flex items-center gap-1">
                                <Layers size={12} />
                                {build.layerCount}
                            </span>
                        ) : null}
                    </div>

                    <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
            </div>
        </motion.button>
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
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header />
            <ResourceNav />
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-200 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-2xl font-bold text-slate-100">Image Builds</h1>
                        </div>
                        <motion.button
                            onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Plus size={16} />
                            New Build
                        </motion.button>
                    </div>

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
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Image Tag</label>
                                        <input
                                            type="text"
                                            value={tag}
                                            onChange={(e) => setTag(e.target.value)}
                                            placeholder="e.g. my-app:v1.0"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
                                            maxLength={128}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Dockerfile</label>
                                        <textarea
                                            value={dockerfile}
                                            onChange={(e) => setDockerfile(e.target.value)}
                                            rows={10}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors resize-y"
                                            placeholder="FROM ubuntu:latest&#10;RUN apt-get update"
                                            spellCheck={false}
                                        />
                                    </div>

                                    {formError && (
                                        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                                            <XCircle size={14} />
                                            {formError}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 pt-1">
                                        <button
                                            type="submit"
                                            disabled={triggerBuild.isPending}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
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
                                            className="px-4 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Build List */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-slate-500" />
                        </div>
                    ) : builds.length === 0 ? (
                        <div className="text-center py-20">
                            <Hammer size={48} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-500 text-lg">No builds yet</p>
                            <p className="text-slate-600 text-sm mt-1">Create your first image build to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {builds.map((build) => (
                                <BuildRow
                                    key={build._id}
                                    build={build}
                                    onClick={() => navigate(`/builds/${build._id}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default BuildsPage;
