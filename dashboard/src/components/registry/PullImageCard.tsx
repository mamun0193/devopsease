import React, { useState } from 'react';
import { Download, Loader2, Info } from 'lucide-react';
import { useDockerHubStatus, usePullImage } from '../../hooks/useDockerHub';

const PullImageCard: React.FC = () => {
    const { data: status } = useDockerHubStatus();
    const pullMutation = usePullImage();

    const [imageName, setImageName] = useState('');

    const isConnected = status?.connected === true;
    const isPulling = pullMutation.isPending;

    const handlePull = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = imageName.trim();
        if (!trimmed || !isConnected) return;

        pullMutation.mutate(trimmed, {
            onSuccess: () => {
                setImageName('');
            },
        });
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
                <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center border border-purple-500/20">
                    <Download size={16} className="text-purple-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-100">Pull Image</h3>
                    <p className="text-xs text-slate-500">Pull an image from Docker Hub</p>
                </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
                <form onSubmit={handlePull} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Image Name</label>
                        <input
                            type="text"
                            value={imageName}
                            onChange={(e) => setImageName(e.target.value)}
                            placeholder="e.g., redis:alpine, nginx:latest"
                            disabled={!isConnected || isPulling}
                            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 disabled:opacity-50 transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!isConnected || isPulling || !imageName.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isPulling ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Pulling…
                            </>
                        ) : (
                            <>
                                <Download size={14} />
                                Pull Image
                            </>
                        )}
                    </button>
                </form>

                {!isConnected && (
                    <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/15">
                        <Info size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-yellow-400/80">Connect your Docker Hub account above to pull images.</p>
                    </div>
                )}

                <div className="mt-3 flex items-start gap-2 px-1">
                    <Info size={12} className="text-slate-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-600">Pulled images count toward your storage quota.</p>
                </div>
            </div>
        </div>
    );
};

export default PullImageCard;
