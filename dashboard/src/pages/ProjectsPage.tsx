import React, { useState } from 'react';
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
    ArrowLeft,
    Server,
} from 'lucide-react';
import Header from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import { useProjects, useCreateProject } from '../hooks/useProjects';
import type { Project } from '../api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    CREATED: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: <FolderKanban size={14} />, label: 'Created' },
    RUNNING: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <Play size={14} />, label: 'Running' },
    STOPPED: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <Square size={14} />, label: 'Stopped' },
    FAILED: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <AlertTriangle size={14} />, label: 'Failed' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.CREATED;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color} ${config.bg} border ${config.border}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

function ProjectRow({ project, onClick }: { project: Project; onClick: () => void }) {
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
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                        <FolderKanban size={16} className="text-violet-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">{project.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {project.services?.length || 0} service{(project.services?.length || 0) !== 1 ? 's' : ''} · {new Date(project.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <StatusBadge status={project.status} />

                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                        <Server size={12} />
                        {project.services?.length || 0}
                    </div>

                    <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
            </div>
        </motion.button>
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
                            <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
                        </div>
                        <motion.button
                            onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Plus size={16} />
                            New Project
                        </motion.button>
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
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. my-webapp"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-colors"
                                            maxLength={64}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Compose YAML</label>
                                        <textarea
                                            value={composeYaml}
                                            onChange={(e) => setComposeYaml(e.target.value)}
                                            rows={12}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-colors resize-y"
                                            placeholder="services:&#10;  web:&#10;    image: nginx:alpine"
                                            spellCheck={false}
                                        />
                                    </div>

                                    {formError && (
                                        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                                            <XCircle size={14} className="mt-0.5 shrink-0" />
                                            <div>
                                                <p>{formError}</p>
                                                {validationErrors.length > 0 && (
                                                    <ul className="mt-1.5 space-y-0.5 text-red-400/80">
                                                        {validationErrors.map((err, i) => (
                                                            <li key={i}>• {err}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 pt-1">
                                        <button
                                            type="submit"
                                            disabled={createProject.isPending}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
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
                                            className="px-4 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Project List */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-slate-500" />
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-20">
                            <FolderKanban size={48} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-500 text-lg">No projects yet</p>
                            <p className="text-slate-600 text-sm mt-1">Deploy your first multi-service project</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {projects.map((project) => (
                                <ProjectRow
                                    key={project._id}
                                    project={project}
                                    onClick={() => navigate(`/projects/${project._id}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProjectsPage;
