import React, { useState, useMemo } from 'react';
import { Network, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useDispatch } from 'react-redux';
import ConfirmModal from '../components/ConfirmModal';
import NetworkTable from '../components/NetworkTable';
import { useNetworks, useDeleteNetwork } from '../hooks/useNetworks';
import { addToast } from '../store/toastSlice';

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
        <div className="card p-4">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center border border-white/5`}>
                    <Icon size={16} className="text-white" />
                </div>
                <div>
                    <p className="text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">{label}</p>
                    <p className="text-xl font-bold text-dds-text-primary">{value}</p>
                </div>
            </div>
        </div>
    );
}

const NetworksPage: React.FC = () => {
    const dispatch = useDispatch();
    const { data: networks = [], isLoading } = useNetworks();
    const deleteNetwork = useDeleteNetwork();

    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const summary = useMemo(() => ({
        total: networks.length,
        active: networks.filter(n => n.status === 'ACTIVE').length,
        unused: networks.filter(n => n.status === 'UNUSED').length,
    }), [networks]);

    const filteredNetworks = useMemo(() => {
        switch (activeFilter) {
            case 'active': return networks.filter(n => n.status === 'ACTIVE');
            case 'unused': return networks.filter(n => n.status === 'UNUSED');
            default:       return networks;
        }
    }, [networks, activeFilter]);

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
                dispatch(addToast({ message: 'Network deleted successfully', type: 'success', duration: 4000 }));
            },
            onError: (err: any) => {
                dispatch(addToast({
                    message: err?.response?.data?.message || err?.message || 'Failed to delete network',
                    type: 'error',
                    duration: 5000,
                }));
            },
        });
    };

    return (
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center gap-3">
                        <Network size={24} className="text-dds-text-primary" />
                        <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Networks</h1>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-dds-text-muted" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <SummaryCard icon={Network} label="Total Networks" value={summary.total} color="bg-dds-blue" />
                                <SummaryCard icon={CheckCircle2} label="Active" value={summary.active} color="bg-dds-green" />
                                <SummaryCard icon={AlertTriangle} label="Unused" value={summary.unused} color="bg-dds-yellow" />
                            </div>

                            <NetworkTable
                                networks={filteredNetworks}
                                onDelete={handleDeleteRequest}
                                isDeleting={deleteNetwork.isPending}
                                deletingId={deleteNetwork.variables as string | null}
                            />
                        </>
                    )}
                </div>
            </main>

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
