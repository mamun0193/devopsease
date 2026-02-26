import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, X, AlertTriangle } from 'lucide-react';
import { usePushImage } from '../../hooks/useDockerHub';

interface PushImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageId: string;
    imageTag: string;
}

const REPO_TAG_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*(?::[a-zA-Z0-9._-]+)?$/;

const PushImageModal: React.FC<PushImageModalProps> = ({ isOpen, onClose, imageId, imageTag }) => {
    const pushMutation = usePushImage();

    const [repo, setRepo] = useState('');
    const [tag, setTag] = useState('latest');
    const [validationError, setValidationError] = useState<string | null>(null);

    const isPushing = pushMutation.isPending;

    const validate = (): boolean => {
        const trimmedRepo = repo.trim();
        const trimmedTag = tag.trim();

        if (!trimmedRepo) {
            setValidationError('Repository name is required.');
            return false;
        }
        if (/\s/.test(trimmedRepo) || /\s/.test(trimmedTag)) {
            setValidationError('Repository and tag must not contain spaces.');
            return false;
        }
        const fullTag = trimmedTag ? `${trimmedRepo}:${trimmedTag}` : trimmedRepo;
        if (fullTag.length > 128) {
            setValidationError('Repository tag must be under 128 characters.');
            return false;
        }
        if (!REPO_TAG_REGEX.test(fullTag)) {
            setValidationError('Invalid format. Expected: [namespace/]repo[:tag]');
            return false;
        }
        setValidationError(null);
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const repositoryTag = tag.trim() ? `${repo.trim()}:${tag.trim()}` : repo.trim();

        pushMutation.mutate(
            { imageId, repositoryTag },
            {
                onSuccess: () => {
                    setRepo('');
                    setTag('latest');
                    setValidationError(null);
                    onClose();
                },
            }
        );
    };

    const handleClose = () => {
        if (isPushing) return;
        setRepo('');
        setTag('latest');
        setValidationError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
                <motion.div
                    className="relative w-full max-w-md mx-4 bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                                <Upload size={16} className="text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-slate-100">Push Image</h2>
                                <p className="text-xs text-slate-500 truncate max-w-[240px]">{imageTag}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isPushing}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Repository</label>
                            <input
                                type="text"
                                value={repo}
                                onChange={(e) => { setRepo(e.target.value); setValidationError(null); }}
                                placeholder="e.g., myapp or username/myapp"
                                disabled={isPushing}
                                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 disabled:opacity-50 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tag</label>
                            <input
                                type="text"
                                value={tag}
                                onChange={(e) => { setTag(e.target.value); setValidationError(null); }}
                                placeholder="latest"
                                disabled={isPushing}
                                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 disabled:opacity-50 transition-colors"
                            />
                        </div>

                        {validationError && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-red-400">{validationError}</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isPushing}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPushing || !repo.trim()}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isPushing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Pushing…
                                    </>
                                ) : (
                                    <>
                                        <Upload size={14} />
                                        Push
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PushImageModal;
