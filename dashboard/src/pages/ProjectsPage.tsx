import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderKanban,
    Plus,
    ChevronRight,
    Loader2,
    XCircle,
    Play,
    Square,
    AlertTriangle,
} from 'lucide-react';
import { useProjects, useCreateProject } from '../hooks/useProjects';
import type { Project } from '../api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    CREATED: { color: 'text-dds-text-secondary', bg: 'bg-dds-muted', border: 'border-dds-border', icon: <FolderKanban size={12} />, label: 'Created' },
    RUNNING: { color: 'text-dds-green', bg: 'bg-dds-green/10', border: 'border-dds-green/30', icon: <Play size={12} />, label: 'Running' },
    STOPPED: { color: 'text-dds-yellow', bg: 'bg-dds-yellow/10', border: 'border-dds-yellow/30', icon: <Square size={12} />, label: 'Stopped' },
    FAILED: { color: 'text-dds-red', bg: 'bg-dds-red/10', border: 'border-dds-red/30', icon: <AlertTriangle size={12} />, label: 'Failed' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.CREATED;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono tracking-wide ${config.color} ${config.bg} border ${config.border}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

function ProjectRow({ project, onClick }: { project: Project; onClick: () => void }) {
    return (
        <tr 
            onClick={onClick}
            className="group border-b border-dds-border last:border-0 hover:bg-dds-muted/50 cursor-pointer transition-colors"
        >
            <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                    <FolderKanban size={16} className="text-dds-text-muted" />
                    <span className="text-sm font-medium text-dds-text-primary">{project.name}</span>
                </div>
            </td>
            <td className="py-3 px-4">
                <StatusBadge status={project.status} />
            </td>
            <td className="py-3 px-4 text-sm font-mono text-dds-text-secondary">
                {project.services?.length || 0}
            </td>
            <td className="py-3 px-4 text-sm text-dds-text-secondary">
                {new Date(project.createdAt).toLocaleString()}
            </td>
            <td className="py-3 px-4 text-right">
                <ChevronRight size={16} className="text-dds-text-muted group-hover:text-dds-text-primary transition-colors ml-auto" />
            </td>
        </tr>
    );
}

const DEFAULT_COMPOSE = `services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"`;

const ProjectsPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: projects = [], isLoading } = useProjects();
    const createProject = useCreateProject();

    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [composeYaml, setComposeYaml] = useState(DEFAULT_COMPOSE);
    const [formError, setFormError] = useState('');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setValidationErrors([]);

        if (!name.trim()) { setFormError('Project name is required'); return; }
        if (!composeYaml.trim()) { setFormError('Compose YAML is required'); return; }

        try {
            const result = await createProject.mutateAsync({ name: name.trim(), composeYaml });
            setShowForm(false);
            setName('');
            setComposeYaml(DEFAULT_COMPOSE);
            navigate(`/projects/${result._id}`);
        } catch (err: any) {
            const data = err?.response?.data;
            if (data?.validationErrors) {
                setValidationErrors(data.validationErrors);
                setFormError(data.message || 'Validation failed');
            } else {
                setFormError(data?.message || err.message || 'Failed to create project');
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FolderKanban size={24} className="text-dds-text-primary" />
                            <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Projects</h1>
                        </div>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={16} />
                            New Project
                        </button>
                    </div>

                    {/* Create Form */}
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
                                        <label className="block text-[13px] font-medium text-dds-text-primary mb-1.5">Project Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. my-webapp"
                                            className="input w-full"
                                            maxLength={64}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-medium text-dds-text-primary mb-1.5">Compose YAML</label>
                                        <textarea
                                            value={composeYaml}
                                            onChange={(e) => setComposeYaml(e.target.value)}
                                            rows={12}
                                            className="input w-full font-mono text-[13px] resize-y"
                                            placeholder="services:&#10;  web:&#10;    image: nginx:alpine"
                                            spellCheck={false}
                                        />
                                    </div>

                                    {formError && (
                                        <div className="flex items-start gap-2 text-[13px] text-dds-red bg-dds-red/10 border border-dds-red/20 rounded-md p-3">
                                            <XCircle size={14} className="mt-0.5 shrink-0" />
                                            <div>
                                                <p>{formError}</p>
                                                {validationErrors.length > 0 && (
                                                    <ul className="mt-1 space-y-0.5 opacity-80">
                                                        {validationErrors.map((err, i) => (
                                                            <li key={i}>• {err}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="submit"
                                            disabled={createProject.isPending}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            {createProject.isPending ? (
                                                <><Loader2 size={14} className="animate-spin" /> Deploying…</>
                                            ) : (
                                                <><FolderKanban size={14} /> Deploy Project</>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowForm(false); setFormError(''); setValidationErrors([]); }}
                                            className="btn-secondary"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Project List */}
                    <div className="card overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <FolderKanban size={40} className="text-dds-text-muted mb-4" />
                                <h3 className="text-lg font-medium text-dds-text-primary mb-1">No Projects Found</h3>
                                <p className="text-sm text-dds-text-secondary max-w-sm">
                                    Create a new project using docker-compose.yaml to group multiple containers together.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b border-dds-border bg-dds-muted/50">
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Project</th>
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Status</th>
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Services</th>
                                            <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Created At</th>
                                            <th className="py-3 px-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projects.map((project) => (
                                            <ProjectRow
                                                key={project._id}
                                                project={project}
                                                onClick={() => navigate(`/projects/${project._id}`)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProjectsPage;
