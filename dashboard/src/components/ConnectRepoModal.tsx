import React, { useState } from 'react';
import { X, GitBranch, Link, User, Code2, Loader2 } from 'lucide-react';
import { repoApi } from '../services/repo.api';
import type { ConnectRepoPayload } from '../services/repo.api';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const initialForm: ConnectRepoPayload = {
  repoName: '',
  owner: '',
  cloneUrl: '',
  defaultBranch: 'main',
};

const ConnectRepoModal: React.FC<ConnectRepoModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState<ConnectRepoPayload>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ConnectRepoPayload, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ConnectRepoPayload, string>> = {};
    if (!form.repoName.trim()) newErrors.repoName = 'Repository name is required.';
    if (!form.owner.trim()) newErrors.owner = 'Owner is required.';
    if (!form.cloneUrl.trim()) {
      newErrors.cloneUrl = 'Clone URL is required.';
    } else if (!/^https?:\/\/[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}\/.+/.test(form.cloneUrl.trim()) &&
               !/^git@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}:.+/.test(form.cloneUrl.trim())) {
      newErrors.cloneUrl = 'Enter a valid Git URL (e.g. https://github.com/owner/repo.git).';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ConnectRepoPayload]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await repoApi.connect({
        ...form,
        defaultBranch: form.defaultBranch?.trim() || 'main',
      });
      dispatch(addToast({ message: `Repository "${form.repoName}" connected successfully.`, type: 'success', duration: 4000 }));
      setForm(initialForm);
      setErrors({});
      onSuccess();
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to connect repository. Please try again.';
      dispatch(addToast({ message, type: 'error', duration: 5000 }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
              <GitBranch size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-slate-100 font-semibold text-base">Connect Repository</h2>
              <p className="text-slate-400 text-xs mt-0.5">Link a Git repository to DevOpsEase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form for connecting repository*/}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Repo Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Repository Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Code2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                name="repoName"
                value={form.repoName}
                onChange={handleChange}
                placeholder="my-awesome-repo"
                disabled={isSubmitting}
                className={`w-full bg-slate-800/70 border ${errors.repoName ? 'border-red-500/70' : 'border-slate-700'} rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/40 transition-all disabled:opacity-60`}
              />
            </div>
            {errors.repoName && <p className="text-red-400 text-xs mt-1">{errors.repoName}</p>}
          </div>

          {/* Owner */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Owner <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                name="owner"
                value={form.owner}
                onChange={handleChange}
                placeholder="github-username or org"
                disabled={isSubmitting}
                className={`w-full bg-slate-800/70 border ${errors.owner ? 'border-red-500/70' : 'border-slate-700'} rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/40 transition-all disabled:opacity-60`}
              />
            </div>
            {errors.owner && <p className="text-red-400 text-xs mt-1">{errors.owner}</p>}
          </div>

          {/* Clone URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Clone URL <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Link size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                name="cloneUrl"
                value={form.cloneUrl}
                onChange={handleChange}
                placeholder="https://github.com/owner/repo.git"
                disabled={isSubmitting}
                className={`w-full bg-slate-800/70 border ${errors.cloneUrl ? 'border-red-500/70' : 'border-slate-700'} rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/40 transition-all disabled:opacity-60`}
              />
            </div>
            {errors.cloneUrl && <p className="text-red-400 text-xs mt-1">{errors.cloneUrl}</p>}
          </div>

          {/* Default Branch */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Default Branch <span className="text-slate-500">(optional)</span>
            </label>
            <div className="relative">
              <GitBranch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                name="defaultBranch"
                value={form.defaultBranch}
                onChange={handleChange}
                placeholder="main"
                disabled={isSubmitting}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/40 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 hover:text-slate-100 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Connecting…
                </>
              ) : (
                'Connect Repository'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectRepoModal;
