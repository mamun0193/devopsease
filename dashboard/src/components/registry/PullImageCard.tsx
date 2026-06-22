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
        <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-dds-border bg-dds-surface">
                <div className="w-9 h-9 rounded-lg bg-dds-blue/15 flex items-center justify-center border border-dds-blue/20">
                    <Download size={16} className="text-dds-blue" />
                </div>
                <div>
                    <h3 className="text-[13px] font-semibold text-dds-text-primary">Pull Image</h3>
                    <p className="text-[11px] font-mono text-dds-text-muted">Pull an image from Docker Hub</p>
                </div>
            </div>

            <div className="px-6 py-5">
                <form onSubmit={handlePull} className="space-y-4">
                    <div>
                        <label className="block text-[12px] font-medium text-dds-text-secondary mb-1.5">Image Name</label>
                        <input
                            type="text"
                            value={imageName}
                            onChange={(e) => setImageName(e.target.value)}
                            placeholder="e.g., redis:alpine, nginx:latest"
                            disabled={!isConnected || isPulling}
                            className="input w-full"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!isConnected || isPulling || !imageName.trim()}
                        className="btn-primary w-full flex items-center justify-center gap-2"
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
                    <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-dds-yellow/5 border border-dds-yellow/15">
                        <Info size={14} className="text-dds-yellow mt-0.5 shrink-0" />
                        <p className="text-[12px] text-dds-yellow/80">Connect your Docker Hub account above to pull images.</p>
                    </div>
                )}

                <div className="mt-3 flex items-start gap-2 px-1">
                    <Info size={12} className="text-dds-text-muted mt-0.5 shrink-0" />
                    <p className="text-[11px] font-mono text-dds-text-secondary">Pulled images count toward your storage quota.</p>
                </div>
            </div>
        </div>
    );
};

export default PullImageCard;
