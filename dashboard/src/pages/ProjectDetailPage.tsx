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
import ConfirmModal from '../components/ConfirmModal';
import { useProject, useStartProject, useStopProject, useDeleteProject } from '../hooks/useProjects';

const STATUS_CONFIG: Record<string, { badgeClass: string; label: string }> = {
    CREATED: { badgeClass: 'badge badge-queued', label: 'Created' },
    RUNNING: { badgeClass: 'badge badge-success', label: 'Running' },
    STOPPED: { badgeClass: 'badge badge-warning', label: 'Stopped' },
    FAILED: { badgeClass: 'badge badge-failed', label: 'Failed' },
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
            <div className="min-h-screen flex flex-col bg-dds-bg">
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={32} className="animate-spin text-dds-primary" />
                    <p className="text-[13px] font-medium text-dds-text-muted tracking-wide">Loading project details...</p>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen flex flex-col bg-dds-bg">
                <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-dds-surface/50 border border-dds-border rounded-xl m-8 shadow-sm">
                    <AlertTriangle size={48} className="text-dds-red mb-4" />
                    <p className="text-dds-text-primary font-medium text-sm">Project not found</p>
                    <button onClick={() => navigate('/projects')} className="btn-primary mt-4">
                        <ArrowLeft size={16} className="mr-1.5" /> Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.CREATED;
    const isRunning = project.status === 'RUNNING';
    const isBusy = startProject.isPending || stopProject.isPending || deleteProject.isPending;

    return (
        <div className="min-h-screen flex flex-col bg-dds-bg">
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Back + Title */}
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => navigate('/projects')} className="text-dds-text-secondary hover:text-dds-white transition-colors p-1.5 rounded-lg hover:bg-dds-surface">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-dds-surface border border-dds-border flex items-center justify-center shadow-sm">
                                    <FolderKanban size={18} className="text-dds-primary" />
                                </div>
                                <div>
                                    <h1 className="text-base font-semibold text-dds-text-primary leading-tight">{project.name}</h1>
                                    <p className="text-[12px] text-dds-text-muted mt-0.5 font-mono">{project.namespace}</p>
                                </div>
                            </div>
                        </div>
                        <span className={statusConfig.badgeClass}>
                            {statusConfig.label}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mb-6">
                        {isRunning ? (
                            <motion.button
                                onClick={handleStop}
                                disabled={isBusy}
                                className="flex items-center gap-1.5 px-4 h-9 bg-dds-orange/10 hover:bg-dds-orange/20 border border-dds-orange/30 disabled:opacity-50 disabled:cursor-not-allowed text-dds-orange rounded-lg text-[13px] font-medium transition-colors shadow-sm"
                                whileHover={!isBusy ? { scale: 1.02 } : {}}
                                whileTap={!isBusy ? { scale: 0.98 } : {}}
                            >
                                {stopProject.isPending ? <Loader2 size={15} className="animate-spin" /> : <Square size={15} />}
                                Stop
                            </motion.button>
                        ) : (
                            <motion.button
                                onClick={handleStart}
                                disabled={isBusy}
                                className="flex items-center gap-1.5 px-4 h-9 bg-dds-green/10 hover:bg-dds-green/20 border border-dds-green/30 disabled:opacity-50 disabled:cursor-not-allowed text-dds-green rounded-lg text-[13px] font-medium transition-colors shadow-sm"
                                whileHover={!isBusy ? { scale: 1.02 } : {}}
                                whileTap={!isBusy ? { scale: 0.98 } : {}}
                            >
                                {startProject.isPending ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                                Start
                            </motion.button>
                        )}

                        <motion.button
                            onClick={() => setShowDeleteModal(true)}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-4 h-9 bg-dds-red/10 hover:bg-dds-red/20 border border-dds-red/30 text-dds-red rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            whileHover={!isBusy ? { scale: 1.02 } : {}}
                            whileTap={!isBusy ? { scale: 0.98 } : {}}
                        >
                            {deleteProject.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            Delete
                        </motion.button>

                        <button
                            onClick={() => setShowYaml(!showYaml)}
                            className="flex items-center gap-1.5 px-4 h-9 bg-dds-surface hover:bg-dds-bg border border-dds-border text-dds-text-primary rounded-lg text-[13px] font-medium transition-colors ml-auto shadow-sm"
                        >
                            <Code2 size={15} className="text-dds-text-secondary" />
                            {showYaml ? 'Hide' : 'View'} YAML
                        </button>
                    </div>

                    {/* Action Error */}
                    {actionError && (
                        <div className="flex items-center gap-2 text-[13px] text-dds-red bg-dds-red/10 border border-dds-red/20 rounded-xl px-4 py-3 mb-6 shadow-sm">
                            <AlertTriangle size={14} />
                            {actionError}
                        </div>
                    )}

                    {/* YAML Viewer */}
                    {showYaml && project.composeYaml && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-dds-surface border border-dds-border rounded-xl p-5 mb-6 overflow-hidden shadow-sm"
                        >
                            <h3 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Code2 size={14} className="text-dds-primary" />
                                Compose YAML
                            </h3>
                            <pre className="text-[12px] text-dds-text-secondary font-mono bg-dds-bg border border-dds-border/50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                                {project.composeYaml}
                            </pre>
                        </motion.div>
                    )}

                    {/* Services */}
                    <div className="bg-dds-surface border border-dds-border rounded-xl p-6 mb-6 shadow-sm">
                        <h3 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-5 flex items-center gap-2">
                            <Server size={14} className="text-dds-primary" />
                            Services <span className="bg-dds-bg text-dds-text-muted px-1.5 py-0.5 rounded ml-1 border border-dds-border">({project.services?.length || 0})</span>
                        </h3>
                        {project.services && project.services.length > 0 ? (
                            <div className="space-y-3">
                                {project.services.map((svc, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-dds-bg border border-dds-border/50 rounded-xl p-4 transition-colors hover:bg-dds-surface/80">
                                        <div className="w-10 h-10 rounded-lg bg-dds-surface border border-dds-border flex items-center justify-center shadow-sm">
                                            <Box size={16} className="text-dds-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-dds-text-primary">{svc.name}</p>
                                            <p className="text-[12px] text-dds-text-muted font-mono truncate mt-0.5">{svc.image}</p>
                                        </div>
                                        <p className="text-[12px] text-dds-text-secondary font-mono truncate max-w-[200px]" title={svc.containerId}>
                                            {svc.containerId?.substring(0, 12)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[13px] text-dds-text-muted italic">No services</p>
                        )}
                    </div>

                    {/* Networks */}
                    {project.networks && project.networks.length > 0 && (
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-6 mb-6 shadow-sm">
                            <h3 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-5 flex items-center gap-2">
                                <Network size={14} className="text-dds-primary" />
                                Networks
                            </h3>
                            <div className="space-y-2">
                                {project.networks.map((netId, i) => (
                                    <p key={i} className="text-[12px] text-dds-text-primary font-mono bg-dds-bg border border-dds-border/50 rounded-lg px-3 py-2">
                                        {netId.substring(0, 16)}…
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Meta */}
                    <div className="bg-dds-surface border border-dds-border rounded-xl p-6 shadow-sm">
                        <div className="grid grid-cols-2 gap-6 text-[13px]">
                            <div>
                                <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1">Created</p>
                                <p className="text-dds-text-primary font-mono">{new Date(project.createdAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1">Updated</p>
                                <p className="text-dds-text-primary font-mono">{new Date(project.updatedAt).toLocaleString()}</p>
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
