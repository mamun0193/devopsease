import React, { useState } from 'react';
import { Loader2, Link2, Link2Off, User } from 'lucide-react';
import { useDockerHubStatus, useConnectDockerHub, useDisconnectDockerHub } from '../../hooks/useDockerHub';
import ConfirmModal from '../ConfirmModal';

const ConnectDockerHubCard: React.FC = () => {
    const { data: status, isLoading: statusLoading } = useDockerHubStatus();
    const connectMutation = useConnectDockerHub();
    const disconnectMutation = useDisconnectDockerHub();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password) return;

        connectMutation.mutate(
            { username: username.trim(), password },
            {
                onSuccess: () => {
                    setUsername('');
                    setPassword('');
                },
                onSettled: () => {
                    setPassword('');
                },
            }
        );
    };

    const handleDisconnect = () => {
        setShowDisconnectModal(false);
        disconnectMutation.mutate();
    };

    const isConnected = status?.connected === true;
    const isSubmitting = connectMutation.isPending || disconnectMutation.isPending;

    if (statusLoading) {
        return (
            <div className="card p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-dds-text-muted" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-dds-border bg-dds-surface">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-dds-blue/15 flex items-center justify-center border border-dds-blue/20">
                            <Link2 size={16} className="text-dds-blue" />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-semibold text-dds-text-primary">Docker Hub Connection</h3>
                            <p className="text-[11px] font-mono text-dds-text-muted">Connect your Docker Hub account</p>
                        </div>
                    </div>
                    {isConnected && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono font-medium text-dds-green bg-dds-green/10 border border-dds-green/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-dds-green animate-pulse" />
                            Connected
                        </span>
                    )}
                </div>

                <div className="px-6 py-5">
                    {isConnected ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-dds-muted flex items-center justify-center border border-dds-border">
                                    <User size={18} className="text-dds-text-muted" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-medium text-dds-text-primary">{status?.username}</p>
                                    <p className="text-[11px] font-mono text-dds-text-secondary">Docker Hub Account</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDisconnectModal(true)}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium text-dds-red bg-dds-red/10 border border-dds-red/25 hover:bg-dds-red/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Link2Off size={14} />
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleConnect} className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-medium text-dds-text-secondary mb-1.5">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Docker Hub username"
                                    disabled={isSubmitting}
                                    autoComplete="username"
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-dds-text-secondary mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Docker Hub password or access token"
                                    disabled={isSubmitting}
                                    autoComplete="current-password"
                                    className="input w-full"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !username.trim() || !password}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Connecting…
                                    </>
                                ) : (
                                    <>
                                        <Link2 size={14} />
                                        Connect Docker Hub
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={showDisconnectModal}
                onClose={() => setShowDisconnectModal(false)}
                onConfirm={handleDisconnect}
                title="Disconnect Docker Hub"
                message="This will remove your stored Docker Hub credentials. You will need to reconnect to pull or push images."
                confirmLabel="Disconnect"
                isDangerous
            />
        </>
    );
};

export default ConnectDockerHubCard;
