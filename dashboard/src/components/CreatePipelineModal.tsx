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
                        <DialogPanel className="w-full max-w-lg max-h-[90vh] transform flex flex-col overflow-y-auto rounded-xl bg-dds-bg border border-dds-border shadow-2xl transition-all">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-dds-border bg-dds-surface/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-dds-primary/10 border border-dds-primary/20 flex items-center justify-center shadow-inner">
                                        <GitMerge size={18} className="text-dds-primary" />
                                    </div>
                                    <DialogTitle className="text-base font-semibold text-dds-text-primary">
                                        Create Pipeline
                                    </DialogTitle>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-dds-text-muted hover:text-dds-white hover:bg-dds-surface transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                                <div className="px-6 py-5 space-y-5 flex-1">
                                    {/* Step 1: Repository */}
                                    <div>
                                        <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">Repository <span className="text-dds-red">*</span></label>
                                        {loadingRepos ? (
                                            <div className="flex items-center gap-2 text-[13px] text-dds-text-muted py-2">
                                                <Loader2 size={14} className="animate-spin" />
                                                Loading repositories…
                                            </div>
                                        ) : repos.length === 0 ? (
                                            <p className="text-[13px] text-dds-text-muted py-2 bg-dds-surface border border-dds-border rounded-md px-3">
                                                No repositories connected. Connect a repository first.
                                            </p>
                                        ) : (
                                            <select
                                                value={selectedRepo}
                                                onChange={(e) => { setSelectedRepo(e.target.value); setPipelineName(''); }}
                                                className="w-full bg-dds-surface border border-dds-border rounded-md px-4 py-2.5 text-dds-text-primary text-[13px] focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 transition-colors appearance-none cursor-pointer"
                                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                            >
                                                <option value="" className="text-dds-text-muted bg-dds-surface">Select a repository…</option>
                                                {repos.map(repo => (
                                                    <option key={repo._id} value={repo._id} className="bg-dds-surface text-dds-text-primary">
                                                        {repo.owner}/{repo.repoName}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Step 2: Branch */}
                                    <div>
                                        <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">
                                            <GitBranch size={13} className="inline mr-1.5 -mt-0.5" />
                                            Branch
                                        </label>
                                        <input
                                            type="text"
                                            value={branch}
                                            onChange={(e) => setBranch(e.target.value)}
                                            placeholder="main"
                                            className="w-full bg-dds-surface border border-dds-border rounded-md px-4 py-2.5 text-dds-text-primary text-[13px] placeholder:text-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 transition-colors"
                                        />
                                    </div>

                                    {/* Step 3: Name */}
                                    <div>
                                        <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">Pipeline Name</label>
                                        <input
                                            type="text"
                                            value={pipelineName}
                                            onChange={(e) => setPipelineName(e.target.value)}
                                            placeholder="my-app-pipeline"
                                            maxLength={128}
                                            className="w-full bg-dds-surface border border-dds-border rounded-md px-4 py-2.5 text-dds-text-primary text-[13px] placeholder:text-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 transition-colors"
                                        />
                                    </div>

                                    {/* Step 4: Pipeline Steps */}
                                    <div className="pt-2">
                                        <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">
                                            <CheckSquare size={13} className="inline mr-1.5 -mt-0.5" />
                                            Pipeline Steps
                                        </label>
                                        <div className="space-y-2">
                                            {AVAILABLE_STEPS.map((step) => (
                                                <button
                                                    key={step.name}
                                                    type="button"
                                                    onClick={() => toggleStep(step.name)}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-all ${
                                                        selectedSteps.has(step.name)
                                                            ? 'bg-dds-primary/10 border-dds-primary/40 text-dds-text-primary'
                                                            : 'bg-dds-surface border-dds-border text-dds-text-secondary hover:border-dds-border/80'
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                                                        selectedSteps.has(step.name)
                                                            ? 'bg-dds-primary border-dds-primary'
                                                            : 'border-dds-text-muted bg-dds-bg'
                                                    }`}>
                                                        {selectedSteps.has(step.name) && (
                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-medium">{step.label}</p>
                                                        <p className="text-[11px] text-dds-text-muted mt-0.5">{step.description}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Error */}
                                    {error && (
                                        <div className="flex items-center gap-2 text-[13px] text-dds-red bg-dds-red/10 border border-dds-red/20 rounded-md px-4 py-2.5">
                                            <AlertCircle size={14} />
                                            {error}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-dds-border bg-dds-surface/50 mt-auto">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createPipeline.isPending || !selectedRepo || selectedSteps.size === 0}
                                        className="btn-primary flex-1 flex justify-center items-center"
                                    >
                                        {createPipeline.isPending ? (
                                            <><Loader2 size={14} className="animate-spin mr-2" /> Creating…</>
                                        ) : (
                                            <><GitMerge size={14} className="mr-2" /> Create Pipeline</>
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
