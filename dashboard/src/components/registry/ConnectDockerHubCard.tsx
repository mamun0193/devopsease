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
                    // Always clear password from state after request resolves
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
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-slate-500" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center border border-blue-500/20">
                            <Link2 size={16} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-100">Docker Hub Connection</h3>
                            <p className="text-xs text-slate-500">Connect your Docker Hub account</p>
                        </div>
                    </div>
                    {isConnected && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected
                        </span>
                    )}
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    {isConnected ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                    <User size={18} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{status?.username}</p>
                                    <p className="text-xs text-slate-500">Docker Hub Account</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDisconnectModal(true)}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Link2Off size={14} />
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleConnect} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Docker Hub username"
                                    disabled={isSubmitting}
                                    autoComplete="username"
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 disabled:opacity-50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Docker Hub password or access token"
                                    disabled={isSubmitting}
                                    autoComplete="current-password"
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 disabled:opacity-50 transition-colors"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !username.trim() || !password}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
