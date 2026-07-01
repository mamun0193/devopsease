import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import {
    Container,
    Server,
    CheckCircle2,
    XOctagon,
    Loader2,
    Lock,
    User,
    Key,
    Shield,
    TerminalSquare
} from 'lucide-react';
import { api } from '../api';
import { addToast } from '../store/toastSlice';

// API call for fetching registry status
const getDockerHubStatus = async () => {
    const res = await api.get('/dockerhub/status');
    return res.data;
};

// API call for connecting to Docker Hub
const connectDockerHub = async (credentials: { username: string; token: string }) => {
    const res = await api.post('/dockerhub/auth', credentials);
    return res.data;
};

// API call for disconnecting
const disconnectDockerHub = async () => {
    const res = await api.delete('/dockerhub/disconnect');
    return res.data;
};

const RegistryPage: React.FC = () => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const [username, setUsername] = useState('');
    const [token, setToken] = useState('');

    const { data: status, isLoading: statusLoading } = useQuery({
        queryKey: ['dockerhub-status'],
        queryFn: getDockerHubStatus,
    });

    const connectMutation = useMutation({
        mutationFn: connectDockerHub,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dockerhub-status'] });
            dispatch(addToast({ message: 'Connected to Docker Hub successfully', type: 'success', duration: 4000 }));
            setUsername('');
            setToken('');
        },
        onError: (err: any) => {
            dispatch(addToast({ 
                message: err?.response?.data?.error || 'Failed to connect. Check credentials.', 
                type: 'error',
                duration: 5000
            }));
        },
    });

    const disconnectMutation = useMutation({
        mutationFn: disconnectDockerHub,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dockerhub-status'] });
            dispatch(addToast({ message: 'Disconnected from Docker Hub', type: 'success', duration: 4000 }));
        },
        onError: () => {
            dispatch(addToast({ message: 'Failed to disconnect', type: 'error', duration: 5000 }));
        }
    });

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !token) return;
        connectMutation.mutate({ username, token });
    };

    const isConnected = status?.authenticated;

    return (
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1D63ED]/10 flex items-center justify-center border border-[#1D63ED]/30 shadow-sm">
                            <Container size={20} className="text-[#1D63ED]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Image Registries</h1>
                            <p className="text-[13px] text-dds-text-muted mt-1">Connect your registries to push and pull images.</p>
                        </div>
                    </div>

                    {statusLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Docker Hub Card */}
                            <motion.div 
                                className="bg-dds-surface border border-dds-border rounded-xl shadow-sm overflow-hidden"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="p-6 border-b border-dds-border bg-dds-muted/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                                                <svg xmlns="http://www.3w.org/2000/svg" viewBox="0 0 24 24" fill="#1D63ED" className="w-8 h-8">
                                                    <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185m-2.81 0h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185m0-2.81h2.118a.186.186 0 00.186-.186V6.196a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.886c0 .103.083.186.185.186m-2.81 2.81h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185m0-2.81h2.118a.186.186 0 00.186-.186V6.196a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.886c0 .103.083.186.185.186m-2.81 2.81h2.119a.186.186 0 00.185-.185V9.006a.186.186 0 00-.185-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.082.185.185.185m-2.81 0h2.119a.186.186 0 00.185-.185V9.006a.186.186 0 00-.185-.186h-2.119a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.81 0h2.119a.186.186 0 00.185-.185V9.006a.186.186 0 00-.185-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.082.185.185.185m22.213-3.23c-.066-.015-.126-.002-.18.04l-1.042.8c-.378-.291-.806-.474-1.282-.533l-.15-.992a.214.214 0 00-.212-.178h-1.325a.215.215 0 00-.213.178l-.149.992c-.476.059-.904.242-1.282.533l-1.042-.8a.222.222 0 00-.236-.007l-1.144.66a.22.22 0 00-.094.218l.386.936c-.221.36-.367.769-.413 1.206h-5.071c-.08 0-.146.066-.146.146v.385c0 .08.066.146.146.146h4.86c.036.758.261 1.458.627 2.067-.532-.016-1.134-.143-1.637-.43-.76-.43-1.378-1.01-1.782-1.68-.415-.688-.6-1.464-.537-2.261.066-.826.398-1.57.94-2.108.547-.542 1.26-.883 2.05-1.002a3.864 3.864 0 011.66.104l.583-1.037a5.006 5.006 0 00-2.316-.27c-1.026.154-1.946.596-2.652 1.296-.702.696-1.134 1.658-1.218 2.732-.084 1.033.152 2.032.68 2.912.528.874 1.326 1.616 2.302 2.164.966.541 2.083.844 3.208.844.204 0 .41-.013.616-.039 1.157-.152 2.227-.68 3.036-1.517.818-.845 1.295-1.95 1.373-3.14.01-.137.014-.275.014-.415 0-.102 0-.206-.004-.308h.001c0-.08-.066-.146-.146-.146h-1.61c-.08 0-.146.066-.146.146 0 .048-.002.096-.002.143-.05 1.474-1.258 2.656-2.73 2.656-.252 0-.498-.035-.733-.1-.384.81-1.214 1.37-2.186 1.37-1.332 0-2.414-1.082-2.414-2.414 0-.968.57-1.802 1.378-2.186a2.698 2.698 0 01-.1-.733c0-.18.018-.358.05-.53.072-.4.22-.77.419-1.1h1.341c.21 0 .385-.175.385-.386v-1.144a.386.386 0 00-.385-.386h-1.066c-.161-.202-.34-.388-.535-.558.175-.205.372-.39.587-.55l.89.684a.222.222 0 00.273.01l1.144-.66a.22.22 0 00.083-.223z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-dds-text-primary">Docker Hub</h2>
                                                <p className="text-[13px] text-dds-text-muted">The world's largest library and community for container images.</p>
                                            </div>
                                        </div>
                                        {isConnected ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-dds-green bg-dds-green/10 border border-dds-green/20">
                                                <CheckCircle2 size={14} />
                                                Connected
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-dds-text-muted bg-dds-bg border border-dds-border">
                                                <XOctagon size={14} />
                                                Not Connected
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    {isConnected ? (
                                        <div className="space-y-6">
                                            <div className="flex flex-col sm:flex-row gap-6">
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-dds-bg border border-dds-border flex items-center justify-center">
                                                            <User size={14} className="text-dds-text-secondary" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Account</p>
                                                            <p className="text-sm font-medium text-dds-text-primary">{status.username}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-dds-bg border border-dds-border flex items-center justify-center">
                                                            <Shield size={14} className="text-dds-green" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Security</p>
                                                            <p className="text-sm text-dds-text-secondary">Credentials securely managed via Secrets Platform</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 bg-dds-bg border border-dds-border rounded-xl p-4">
                                                    <h3 className="text-[12px] font-mono font-medium text-dds-text-secondary uppercase mb-3">Capabilities Enabled</h3>
                                                    <ul className="space-y-2">
                                                        <li className="flex items-center gap-2 text-sm text-dds-text-primary">
                                                            <CheckCircle2 size={14} className="text-dds-green" /> Pull private images
                                                        </li>
                                                        <li className="flex items-center gap-2 text-sm text-dds-text-primary">
                                                            <CheckCircle2 size={14} className="text-dds-green" /> Push images to your repositories
                                                        </li>
                                                        <li className="flex items-center gap-2 text-sm text-dds-text-primary">
                                                            <CheckCircle2 size={14} className="text-dds-green" /> Higher rate limits
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            
                                            <div className="pt-4 border-t border-dds-border flex justify-end">
                                                <button
                                                    onClick={() => disconnectMutation.mutate()}
                                                    disabled={disconnectMutation.isPending}
                                                    className="btn-ghost text-dds-red hover:bg-dds-red/10 h-9 px-4 text-sm font-medium flex items-center gap-2"
                                                >
                                                    {disconnectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                                                    Disconnect Account
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleConnect} className="space-y-4 max-w-md">
                                            <div>
                                                <label className="block text-[12px] font-medium text-dds-text-secondary mb-1.5 ml-0.5">
                                                    Docker Hub Username
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <User size={16} className="text-dds-text-muted" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={username}
                                                        onChange={(e) => setUsername(e.target.value)}
                                                        placeholder="e.g. devopsease"
                                                        className="input-field pl-10 bg-dds-bg w-full"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-medium text-dds-text-secondary mb-1.5 ml-0.5 flex justify-between">
                                                    <span>Access Token or Password</span>
                                                    <a href="https://hub.docker.com/settings/security" target="_blank" rel="noopener noreferrer" className="text-dds-blue hover:underline">
                                                        Create a token
                                                    </a>
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Key size={16} className="text-dds-text-muted" />
                                                    </div>
                                                    <input
                                                        type="password"
                                                        value={token}
                                                        onChange={(e) => setToken(e.target.value)}
                                                        placeholder="dckr_pat_... or password"
                                                        className="input-field pl-10 bg-dds-bg w-full"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={connectMutation.isPending || !username || !token}
                                                    className="w-full btn-primary h-10 flex items-center justify-center gap-2"
                                                >
                                                    {connectMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <TerminalSquare size={16} />}
                                                    {connectMutation.isPending ? 'Connecting...' : 'Connect Docker Hub'}
                                                </button>
                                            </div>
                                            <p className="text-[12px] text-dds-text-muted mt-4 flex items-center gap-1.5">
                                                <Shield size={12} />
                                                Credentials are encrypted and stored in the Secrets Management Platform.
                                            </p>
                                        </form>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RegistryPage;
