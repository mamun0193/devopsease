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
      <div className="w-full max-w-md bg-dds-bg border border-dds-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dds-border bg-dds-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-dds-primary/10 border border-dds-primary/20 flex items-center justify-center shadow-inner">
              <GitBranch size={18} className="text-dds-primary" />
            </div>
            <div>
              <h2 className="text-dds-text-primary font-semibold text-base">Connect Repository</h2>
              <p className="text-dds-text-secondary text-xs mt-0.5">Link a Git repository to DevOpsEase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-dds-text-muted hover:text-dds-white hover:bg-dds-surface transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form for connecting repository*/}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Repo Name */}
          <div>
            <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1.5">
              Repository Name <span className="text-dds-red">*</span>
            </label>
            <div className="relative">
              <Code2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dds-text-muted pointer-events-none" />
              <input
                type="text"
                name="repoName"
                value={form.repoName}
                onChange={handleChange}
                placeholder="my-awesome-repo"
                disabled={isSubmitting}
                className={`w-full bg-dds-surface border ${errors.repoName ? 'border-dds-red' : 'border-dds-border'} rounded-md pl-9 pr-4 py-2.5 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 transition-all disabled:opacity-60`}
              />
            </div>
            {errors.repoName && <p className="text-dds-red text-xs mt-1">{errors.repoName}</p>}
          </div>

          {/* Owner */}
          <div>
            <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1.5">
              Owner <span className="text-dds-red">*</span>
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dds-text-muted pointer-events-none" />
              <input
                type="text"
                name="owner"
                value={form.owner}
                onChange={handleChange}
                placeholder="github-username or org"
                disabled={isSubmitting}
                className={`w-full bg-dds-surface border ${errors.owner ? 'border-dds-red' : 'border-dds-border'} rounded-md pl-9 pr-4 py-2.5 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 transition-all disabled:opacity-60`}
              />
            </div>
            {errors.owner && <p className="text-dds-red text-xs mt-1">{errors.owner}</p>}
          </div>

          {/* Clone URL */}
          <div>
            <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1.5">
              Clone URL <span className="text-dds-red">*</span>
            </label>
            <div className="relative">
              <Link size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dds-text-muted pointer-events-none" />
              <input
                type="text"
                name="cloneUrl"
                value={form.cloneUrl}
                onChange={handleChange}
                placeholder="https://github.com/owner/repo.git"
                disabled={isSubmitting}
                className={`w-full bg-dds-surface border ${errors.cloneUrl ? 'border-dds-red' : 'border-dds-border'} rounded-md pl-9 pr-4 py-2.5 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 transition-all disabled:opacity-60`}
              />
            </div>
            {errors.cloneUrl && <p className="text-dds-red text-xs mt-1">{errors.cloneUrl}</p>}
          </div>

          {/* Default Branch */}
          <div>
            <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1.5">
              Default Branch <span className="text-dds-text-muted lowercase tracking-normal text-[10px] ml-1 font-sans">(optional)</span>
            </label>
            <div className="relative">
              <GitBranch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dds-text-muted pointer-events-none" />
              <input
                type="text"
                name="defaultBranch"
                value={form.defaultBranch}
                onChange={handleChange}
                placeholder="main"
                disabled={isSubmitting}
                className="w-full bg-dds-surface border border-dds-border rounded-md pl-9 pr-4 py-2.5 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 flex justify-center items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin mr-2" />
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
