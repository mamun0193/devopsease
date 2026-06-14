import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Loader2, GitMerge, GitBranch, CheckSquare, AlertCircle } from 'lucide-react';
import { repoApi } from '../services/repo.api';
import type { Repository } from '../services/repo.api';
import { useCreatePipeline } from '../hooks/usePipelines';

const AVAILABLE_STEPS = [
    { name: 'build', label: 'Build', description: 'Clone repository and build Docker image' },
    { name: 'test', label: 'Test', description: 'Run test suite (npm test / pytest)' },
    { name: 'deploy', label: 'Deploy', description: 'Deploy from latest successful build' },
] as const;

interface CreatePipelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (pipelineId: string) => void;
}

const CreatePipelineModal: React.FC<CreatePipelineModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState<string>('');
    const [branch, setBranch] = useState('main');
    const [pipelineName, setPipelineName] = useState('');
    const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set(['build', 'test', 'deploy']));
    const [error, setError] = useState('');

    const createPipeline = useCreatePipeline();

    // Load repositories when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setLoadingRepos(true);
        repoApi.getAll()
            .then(data => setRepos(data ?? []))
            .catch(() => setRepos([]))
            .finally(() => setLoadingRepos(false));
    }, [isOpen]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedRepo('');
            setBranch('main');
            setPipelineName('');
            setSelectedSteps(new Set(['build', 'test', 'deploy']));
            setError('');
        }
    }, [isOpen]);

    // Auto-fill pipeline name when repo is selected
    useEffect(() => {
        if (selectedRepo) {
            const repo = repos.find(r => r._id === selectedRepo);
            if (repo && !pipelineName) {
                setPipelineName(`${repo.repoName}-pipeline`);
                setBranch(repo.defaultBranch || 'main');
            }
        }
    }, [selectedRepo, repos, pipelineName]);

    const toggleStep = (step: string) => {
        setSelectedSteps(prev => {
            const next = new Set(prev);
            if (next.has(step)) {
                next.delete(step);
            } else {
                next.add(step);
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedRepo) { setError('Please select a repository'); return; }
        if (selectedSteps.size === 0) { setError('Select at least one pipeline step'); return; }

        // Build ordered steps array
        const orderedSteps = AVAILABLE_STEPS
            .map(s => s.name)
            .filter(s => selectedSteps.has(s));

        // Generate YAML from wizard selections
        const yamlString = `name: ${pipelineName || 'pipeline'}\nsteps:\n${orderedSteps.map(s => `  - ${s}`).join('\n')}`;

        try {
            const result = await createPipeline.mutateAsync({
                repoId: selectedRepo,
                yaml: yamlString,
                name: pipelineName || undefined,
            });
            onClose();
            onSuccess?.(result.id);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err.message || 'Failed to create pipeline';
            setError(msg);
        }
    };

    return (
        <Transition show={isOpen}>
            <Dialog onClose={onClose} className="relative z-[100]">
                <TransitionChild
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
                    <TransitionChild
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-lg max-h-[90vh] transform overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl transition-all">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30">
                                        <GitMerge size={18} className="text-violet-400" />
                                    </div>
                                    <DialogTitle className="text-lg font-semibold text-slate-100">
                                        Create Pipeline
                                    </DialogTitle>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                                {/* Step 1: Repository */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Repository</label>
                                    {loadingRepos ? (
                                        <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                                            <Loader2 size={14} className="animate-spin" />
                                            Loading repositories…
                                        </div>
                                    ) : repos.length === 0 ? (
                                        <p className="text-sm text-slate-500 py-2">
                                            No repositories connected. Connect a repository first.
                                        </p>
                                    ) : (
                                        <select
                                            value={selectedRepo}
                                            onChange={(e) => { setSelectedRepo(e.target.value); setPipelineName(''); }}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors appearance-none cursor-pointer"
                                        >
                                            <option value="">Select a repository…</option>
                                            {repos.map(repo => (
                                                <option key={repo._id} value={repo._id}>
                                                    {repo.owner}/{repo.repoName}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Step 2: Branch */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <GitBranch size={14} className="inline mr-1.5 -mt-0.5" />
                                        Branch
                                    </label>
                                    <input
                                        type="text"
                                        value={branch}
                                        onChange={(e) => setBranch(e.target.value)}
                                        placeholder="main"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
                                    />
                                </div>

                                {/* Step 3: Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Pipeline Name</label>
                                    <input
                                        type="text"
                                        value={pipelineName}
                                        onChange={(e) => setPipelineName(e.target.value)}
                                        placeholder="my-app-pipeline"
                                        maxLength={128}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
                                    />
                                </div>

                                {/* Step 4: Pipeline Steps */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <CheckSquare size={14} className="inline mr-1.5 -mt-0.5" />
                                        Pipeline Steps
                                    </label>
                                    <div className="space-y-2">
                                        {AVAILABLE_STEPS.map((step) => (
                                            <button
                                                key={step.name}
                                                type="button"
                                                onClick={() => toggleStep(step.name)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                                                    selectedSteps.has(step.name)
                                                        ? 'bg-blue-500/10 border-blue-500/40 text-slate-100'
                                                        : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                                                    selectedSteps.has(step.name)
                                                        ? 'bg-blue-500 border-blue-500'
                                                        : 'border-slate-600'
                                                }`}>
                                                    {selectedSteps.has(step.name) && (
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{step.label}</p>
                                                    <p className="text-xs text-slate-500">{step.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                                        <AlertCircle size={14} />
                                        {error}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createPipeline.isPending || !selectedRepo || selectedSteps.size === 0}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
                                    >
                                        {createPipeline.isPending ? (
                                            <><Loader2 size={14} className="animate-spin" /> Creating…</>
                                        ) : (
                                            <><GitMerge size={14} /> Create Pipeline</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
};

export default CreatePipelineModal;
