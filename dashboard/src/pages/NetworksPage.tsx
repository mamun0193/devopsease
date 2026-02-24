import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Network, CheckCircle2, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import ConfirmModal from '../components/ConfirmModal';
import NetworkTable from '../components/NetworkTable';
import { useNetworks, useDeleteNetwork } from '../hooks/useNetworks';

function SummaryCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <motion.div
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon size={16} className="text-white" />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-lg font-bold text-slate-100">{value}</p>
                </div>
            </div>
        </motion.div>
    );
}

const NetworksPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: networks = [], isLoading } = useNetworks();
    const deleteNetwork = useDeleteNetwork();

    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const summary = useMemo(() => ({
        total: networks.length,
        active: networks.filter(n => n.status === 'ACTIVE').length,
        unused: networks.filter(n => n.status === 'UNUSED').length,
    }), [networks]);

    const pendingDeleteNetwork = networks.find(n => n.id === pendingDeleteId);

    const handleDeleteRequest = (id: string) => {
        setPendingDeleteId(id);
    };

    const handleDeleteConfirm = () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setPendingDeleteId(null);

        deleteNetwork.mutate(id, {
            onSuccess: () => {
                toast.success('Network deleted successfully', {
                    style: { background: '#020617', color: '#f1f5f9', border: '1px solid #064e3b' },
                });
            },
            onError: (err: any) => {
                toast.error(
                    err?.response?.data?.message || err?.message || 'Failed to delete network',
                    { style: { background: '#020617', color: '#f1f5f9', border: '1px solid #7f1d1d' } }
                );
            },
        });
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header />
            <ResourceNav />

            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Page Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-bold text-slate-100">Networks</h1>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-slate-500" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                                <SummaryCard icon={Network} label="Total Networks" value={summary.total} color="bg-blue-600/20" />
                                <SummaryCard icon={CheckCircle2} label="Active" value={summary.active} color="bg-emerald-600/20" />
                                <SummaryCard icon={AlertTriangle} label="Unused" value={summary.unused} color="bg-yellow-600/20" />
                            </div>

                            {/* Table */}
                            <NetworkTable
                                networks={networks}
                                onDelete={handleDeleteRequest}
                                isDeleting={deleteNetwork.isPending}
                                deletingId={deleteNetwork.variables as string | null}
                            />
                        </>
                    )}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!pendingDeleteId}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Network"
                message={
                    pendingDeleteNetwork
                        ? `Are you sure you want to delete the network "${pendingDeleteNetwork.name}"? This action cannot be undone.`
                        : 'Are you sure you want to delete this network?'
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isDangerous
            />
        </div>
    );
};

export default NetworksPage;
