import React from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Globe, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { useCreateTunnel } from '../../hooks/useTunnels';
import type { ContainerInspect } from '../../api';

interface ExposePortModalProps {
    isOpen: boolean;
    onClose: () => void;
    containerId: string;
    inspectData: ContainerInspect | undefined;
    activeTunnelCount: number;
}

const DURATION_OPTIONS = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '6 hours', value: 360 },
] as const;

const MAX_TUNNELS = 3;

const ExposePortModal: React.FC<ExposePortModalProps> = ({
    isOpen,
    onClose,
    containerId,
    inspectData,
    activeTunnelCount,
}) => {
    const { mutate: createTunnel, isPending } = useCreateTunnel();

    const [selectedPort, setSelectedPort] = React.useState<string>('');
    const [selectedDuration, setSelectedDuration] = React.useState<number>(60);

    // Extract exposed+mapped ports from inspect data
    const mappedPorts = React.useMemo(() => {
        if (!inspectData?.ports) return [];
        return Object.entries(inspectData.ports)
            .filter(([, bindings]) => bindings && bindings.length > 0)
            .map(([containerPort, bindings]) => ({
                containerPort,
                hostPort: bindings[0].HostPort,
                // e.g. "3000/tcp" → 3000
                internalPort: parseInt(containerPort.split('/')[0], 10),
            }));
    }, [inspectData]);

    // Reset selection when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setSelectedPort(mappedPorts[0]?.containerPort ?? '');
            setSelectedDuration(60);
        }
    }, [isOpen, mappedPorts]);

    const isAtQuota = activeTunnelCount >= MAX_TUNNELS;
    const hasNoPorts = mappedPorts.length === 0;
    const canSubmit = !isPending && !isAtQuota && !hasNoPorts && !!selectedPort;

    const handleSubmit = () => {
        if (!canSubmit) return;
        const portEntry = mappedPorts.find((p) => p.containerPort === selectedPort);
        if (!portEntry) return;

        createTunnel(
            {
                containerId,
                port: portEntry.internalPort,
                durationMinutes: selectedDuration,
            },
            {
                onSuccess: () => {
                    onClose();
                },
            }
        );
    };

    return (
        <Transition show={isOpen}>
            <Dialog onClose={isPending ? () => { } : onClose} className="relative z-[100]">
                {/* Backdrop */}
                <TransitionChild
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <TransitionChild
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-violet-500/10">
                                        <Globe size={18} className="text-violet-400" />
                                    </div>
                                    <DialogTitle className="text-base font-semibold text-slate-100">
                                        Expose Port Publicly
                                    </DialogTitle>
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={isPending}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-5 py-4 space-y-5">
                                {/* Info banner */}
                                <div className="flex items-start gap-3 p-3 bg-violet-500/8 border border-violet-500/20 rounded-lg">
                                    <Globe size={15} className="text-violet-400 mt-0.5 shrink-0" />
                                    <p className="text-xs text-violet-300 leading-relaxed">
                                        Creates a temporary, time-limited public HTTPS URL for this container port.
                                        The tunnel expires automatically and can be revoked at any time.
                                    </p>
                                </div>

                                {/* Quota warning */}
                                {isAtQuota && (
                                    <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg">
                                        <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                                        <p className="text-xs text-amber-300">
                                            You've reached the maximum of {MAX_TUNNELS} active tunnels.
                                            Revoke an existing tunnel to create a new one.
                                        </p>
                                    </div>
                                )}

                                {/* No ports warning */}
                                {!isAtQuota && hasNoPorts && (
                                    <div className="flex items-start gap-3 p-3 bg-slate-800/60 border border-slate-700 rounded-lg">
                                        <AlertTriangle size={15} className="text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-xs text-slate-400">
                                            This container has no mapped ports. Start the container with at least one
                                            published port (e.g. <code className="font-mono">-p 3000:3000</code>) to use this feature.
                                        </p>
                                    </div>
                                )}

                                {/* Port selector */}
                                {!hasNoPorts && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-300">
                                            Container Port
                                        </label>
                                        <select
                                            value={selectedPort}
                                            onChange={(e) => setSelectedPort(e.target.value)}
                                            disabled={isPending || isAtQuota}
                                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200
                                 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors appearance-none"
                                        >
                                            {mappedPorts.map((p) => (
                                                <option key={p.containerPort} value={p.containerPort}>
                                                    {p.containerPort} → host:{p.hostPort}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-500">
                                            Only ports mapped to the host can be exposed publicly.
                                        </p>
                                    </div>
                                )}

                                {/* Duration selector */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-300">
                                        <Clock size={13} className="inline mr-1.5 text-slate-400" />
                                        Access Duration
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {DURATION_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setSelectedDuration(opt.value)}
                                                disabled={isPending || isAtQuota}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed
                          ${selectedDuration === opt.value
                                                        ? 'bg-violet-500/15 border-violet-500/50 text-violet-300'
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-800/40 border-t border-slate-800">
                                <button
                                    onClick={onClose}
                                    disabled={isPending}
                                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!canSubmit}
                                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Creating tunnel…
                                        </>
                                    ) : (
                                        <>
                                            <Globe size={14} />
                                            Expose Port
                                        </>
                                    )}
                                </button>
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ExposePortModal;
