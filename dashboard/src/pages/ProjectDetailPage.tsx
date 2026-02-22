import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FolderKanban,
    ArrowLeft,
    Play,
    Square,
    Trash2,
    Loader2,
    Server,
    Network,
    AlertTriangle,
    Code2,
    Box,
} from 'lucide-react';
import Header from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import ConfirmModal from '../components/ConfirmModal';
import { useProject, useStartProject, useStopProject, useDeleteProject } from '../hooks/useProjects';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
    CREATED: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', dot: 'bg-slate-400', label: 'Created' },
    RUNNING: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500 animate-pulse', label: 'Running' },
    STOPPED: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500', label: 'Stopped' },
    FAILED: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500', label: 'Failed' },
};

const ProjectDetailPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { data: project, isLoading, error } = useProject(projectId || '');
    const startProject = useStartProject();
    const stopProject = useStopProject();
    const deleteProject = useDeleteProject();

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showYaml, setShowYaml] = useState(false);
    const [actionError, setActionError] = useState('');

    const handleStart = async () => {
        if (!projectId) return;
        setActionError('');
        try {
            await startProject.mutateAsync(projectId);
        } catch (err: any) {
            setActionError(err?.response?.data?.message || 'Failed to start project');
        }
    };

    const handleStop = async () => {
        if (!projectId) return;
        setActionError('');
        try {
            await stopProject.mutateAsync(projectId);
        } catch (err: any) {
            setActionError(err?.response?.data?.message || 'Failed to stop project');
        }
    };

    const handleDelete = async () => {
        if (!projectId) return;
        setActionError('');
        try {
            await deleteProject.mutateAsync(projectId);
            navigate('/projects');
        } catch (err: any) {
            setActionError(err?.response?.data?.message || 'Failed to delete project');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-950">
                <Header />
                <ResourceNav />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-slate-500" />
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-950">
                <Header />
                <ResourceNav />
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <AlertTriangle size={48} className="text-red-400" />
                    <p className="text-slate-400 text-lg">Project not found</p>
                    <button onClick={() => navigate('/projects')} className="text-blue-400 hover:text-blue-300 text-sm">
                        ← Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.CREATED;
    const isRunning = project.status === 'RUNNING';
    const isBusy = startProject.isPending || stopProject.isPending || deleteProject.isPending;

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header />
            <ResourceNav />
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Back + Title */}
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => navigate('/projects')} className="text-slate-400 hover:text-slate-200 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                                    <FolderKanban size={20} className="text-violet-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
                                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{project.namespace}</p>
                                </div>
                            </div>
                        </div>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium ${statusConfig.color} ${statusConfig.bg} border ${statusConfig.border}`}>
                            <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                            {statusConfig.label}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mb-6">
                        {isRunning ? (
                            <motion.button
                                onClick={handleStop}
                                disabled={isBusy}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-600/50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {stopProject.isPending ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                                Stop
                            </motion.button>
                        ) : (
                            <motion.button
                                onClick={handleStart}
                                disabled={isBusy}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {startProject.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                Start
                            </motion.button>
                        )}

                        <motion.button
                            onClick={() => setShowDeleteModal(true)}
                            disabled={isBusy}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Trash2 size={14} />
                            Delete
                        </motion.button>

                        <button
                            onClick={() => setShowYaml(!showYaml)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors ml-auto"
                        >
                            <Code2 size={14} />
                            {showYaml ? 'Hide' : 'View'} YAML
                        </button>
                    </div>

                    {/* Action Error */}
                    {actionError && (
                        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mb-6">
                            <AlertTriangle size={14} />
                            {actionError}
                        </div>
                    )}

                    {/* YAML Viewer */}
                    {showYaml && project.composeYaml && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 overflow-hidden"
                        >
                            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                <Code2 size={14} />
                                Compose YAML
                            </h3>
                            <pre className="text-xs text-slate-300 font-mono bg-slate-800/50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                                {project.composeYaml}
                            </pre>
                        </motion.div>
                    )}

                    {/* Services */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
                        <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                            <Server size={14} />
                            Services ({project.services?.length || 0})
                        </h3>
                        {project.services && project.services.length > 0 ? (
                            <div className="space-y-2">
                                {project.services.map((svc, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                            <Box size={14} className="text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200">{svc.name}</p>
                                            <p className="text-xs text-slate-500 font-mono truncate">{svc.image}</p>
                                        </div>
                                        <p className="text-xs text-slate-600 font-mono truncate max-w-[200px]" title={svc.containerId}>
                                            {svc.containerId?.substring(0, 12)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">No services</p>
                        )}
                    </div>

                    {/* Networks */}
                    {project.networks && project.networks.length > 0 && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
                            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                <Network size={14} />
                                Networks
                            </h3>
                            <div className="space-y-1">
                                {project.networks.map((netId, i) => (
                                    <p key={i} className="text-xs text-slate-400 font-mono bg-slate-800/50 rounded-lg px-3 py-2">
                                        {netId.substring(0, 16)}…
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Meta */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-slate-500 text-xs">Created</p>
                                <p className="text-slate-300">{new Date(project.createdAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-xs">Updated</p>
                                <p className="text-slate-300">{new Date(project.updatedAt).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={() => { setShowDeleteModal(false); handleDelete(); }}
                title="Delete Project"
                message={`Are you sure you want to delete "${project.name}"? This will stop and remove all containers and networks.`}
                confirmLabel="Delete"
                isDangerous={true}
            />
        </div>
    );
};

export default ProjectDetailPage;
