import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Package, PenLine, Cpu, HardDrive, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAppDispatch } from '../store/hooks';
import { createContainer } from '../store/containersSlice';
import { useQueryClient } from '@tanstack/react-query';
import { buildApi } from '../api';
import type { BuiltImage } from '../api';
import { useQuota } from '../hooks/useQuota';

interface CreateContainerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface PortMapping {
    id: string;
    containerPort: string;
    hostPort: string;
}

interface EnvVar {
    id: string;
    key: string;
    value: string;
}

type ImageSource = 'built' | 'custom';

const CreateContainerModal: React.FC<CreateContainerModalProps> = ({ isOpen, onClose }) => {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    const [image, setImage] = useState('');
    const [name, setName] = useState('');
    const [autoStart, setAutoStart] = useState(true);
    const [ports, setPorts] = useState<PortMapping[]>([]);
    const [envVars, setEnvVars] = useState<EnvVar[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [imageSource, setImageSource] = useState<ImageSource>('built');
    const [builtImages, setBuiltImages] = useState<BuiltImage[]>([]);
    const [imagesLoading, setImagesLoading] = useState(false);
    const [cpuLimit, setCpuLimit] = useState<number>(0.5);
    const [memoryLimit, setMemoryLimit] = useState<number>(256);
    const [restartPolicy, setRestartPolicy] = useState<string>('no');
    const [maxRetryCount, setMaxRetryCount] = useState<number>(3);

    const { data: quota } = useQuota();

    // Only container count matters for creation validation
    const containerFull = quota ? quota.usedContainers >= quota.maxContainers : false;

    useEffect(() => {
        if (isOpen) {
            setImagesLoading(true);
            buildApi.listImages()
                .then(images => {
                    setBuiltImages(images);
                    if (images.length === 0) setImageSource('custom');
                })
                .catch(() => setBuiltImages([]))
                .finally(() => setImagesLoading(false));
        }
    }, [isOpen]);

    const handleAddPort = () => {
        setPorts([...ports, { id: crypto.randomUUID(), containerPort: '', hostPort: '' }]);
    };

    const handleRemovePort = (id: string) => {
        setPorts(ports.filter(p => p.id !== id));
    };

    const handlePortChange = (id: string, field: 'containerPort' | 'hostPort', value: string) => {
        setPorts(ports.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleAddEnvVar = () => {
        setEnvVars([...envVars, { id: crypto.randomUUID(), key: '', value: '' }]);
    };

    const handleRemoveEnvVar = (id: string) => {
        setEnvVars(envVars.filter(e => e.id !== id));
    };

    const handleEnvVarChange = (id: string, field: 'key' | 'value', value: string) => {
        setEnvVars(envVars.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!image.trim()) {
            setError('Image name is required');
            return;
        }

        setIsSubmitting(true);

        try {
            const portsObj: Record<string, number> = {};
            ports.forEach(p => {
                if (p.containerPort && p.hostPort) {
                    portsObj[p.containerPort] = parseInt(p.hostPort, 10);
                }
            });

            const envObj: Record<string, string> = {};
            envVars.forEach(e => {
                if (e.key && e.value) {
                    envObj[e.key] = e.value;
                }
            });

            const result = await dispatch(createContainer({
                image: image.trim(),
                name: name.trim() || undefined,
                ports: Object.keys(portsObj).length > 0 ? portsObj : undefined,
                env: Object.keys(envObj).length > 0 ? envObj : undefined,
                autoStart,
                cpuLimit,
                memoryLimit,
                restartPolicy: restartPolicy !== 'no' ? restartPolicy : undefined,
                maxRetryCount: restartPolicy !== 'no' ? maxRetryCount : undefined,
            }));

            if (!result.type.endsWith('/rejected')) {
                queryClient.invalidateQueries({ queryKey: ['containers'] });
                queryClient.invalidateQueries({ queryKey: ['actions'] });

                setImage('');
                setName('');
                setPorts([]);
                setEnvVars([]);
                setAutoStart(true);
                setCpuLimit(0.5);
                setMemoryLimit(256);
                setRestartPolicy('no');
                setMaxRetryCount(3);
                setImageSource('built');
                onClose();
            } else {
                setError('Failed to create container');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setImage('');
            setName('');
            setPorts([]);
            setEnvVars([]);
            setAutoStart(true);
            setCpuLimit(0.5);
            setMemoryLimit(256);
            setRestartPolicy('no');
            setMaxRetryCount(3);
            setImageSource('built');
            setError(null);
            onClose();
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-dds-bg border border-dds-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-dds-border bg-dds-surface/50">
                                <h2 className="text-xl font-semibold text-dds-text-primary">Create Container</h2>
                                <button
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    className="text-dds-text-muted hover:text-dds-white hover:bg-dds-surface p-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
                                <div className="p-6 space-y-6 flex-1">
                                    {/* Error Message */}
                                    {error && (
                                        <div className="bg-dds-red/10 border border-dds-red/30 text-dds-red px-4 py-3 rounded-lg text-sm">
                                            {error}
                                        </div>
                                    )}

                                    {/* Image Selection */}
                                    <div>
                                        <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">
                                            Image <span className="text-dds-red">*</span>
                                        </label>

                                        {/* Source tabs */}
                                        <div className="flex gap-1 mb-3 bg-dds-surface rounded-lg p-1 border border-dds-border/50">
                                            <button
                                                type="button"
                                                onClick={() => { setImageSource('built'); setImage(''); }}
                                                disabled={isSubmitting}
                                                className={`flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${imageSource === 'built'
                                                    ? 'bg-dds-primary/10 text-dds-primary border border-dds-primary/30'
                                                    : 'text-dds-text-muted hover:text-dds-text-primary'
                                                    }`}
                                            >
                                                <Package size={13} />
                                                My Images
                                                {builtImages.length > 0 && (
                                                    <span className="ml-auto text-[10px] bg-dds-bg/80 border border-dds-border/50 px-1.5 py-0.5 rounded-full text-dds-text-secondary">
                                                        {builtImages.length}
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setImageSource('custom'); setImage(''); }}
                                                disabled={isSubmitting}
                                                className={`flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${imageSource === 'custom'
                                                    ? 'bg-dds-primary/10 text-dds-primary border border-dds-primary/30'
                                                    : 'text-dds-text-muted hover:text-dds-text-primary'
                                                    }`}
                                            >
                                                <PenLine size={13} />
                                                Custom Image
                                            </button>
                                        </div>

                                        {/* Built images dropdown */}
                                        {imageSource === 'built' && (
                                            <>
                                                {imagesLoading ? (
                                                    <div className="flex items-center gap-2 text-dds-text-muted text-sm py-2">
                                                        <Loader2 size={14} className="animate-spin" /> Loading images…
                                                    </div>
                                                ) : builtImages.length === 0 ? (
                                                    <div className="text-sm text-dds-text-muted bg-dds-surface border border-dds-border rounded-lg px-4 py-3">
                                                        No built images yet. Build an image first or use a custom image name.
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={image}
                                                        onChange={(e) => setImage(e.target.value)}
                                                        disabled={isSubmitting}
                                                        className="w-full bg-dds-surface border border-dds-border rounded-md px-4 py-2.5 text-[13px] text-dds-text-primary focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50 appearance-none cursor-pointer"
                                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                                    >
                                                        <option value="" className="bg-dds-surface text-dds-text-muted">Select a built image…</option>
                                                        {builtImages.map(img => (
                                                            <option key={img._id} value={img.tag} className="bg-dds-surface text-dds-text-primary">
                                                                {img.tag} — {img.sizeMB.toFixed(1)} MB, {img.layerCount} layers
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </>
                                        )}

                                        {/* Custom image input */}
                                        {imageSource === 'custom' && (
                                            <input
                                                type="text"
                                                value={image}
                                                onChange={(e) => setImage(e.target.value)}
                                                placeholder="e.g., nginx:latest"
                                                disabled={isSubmitting}
                                                className="w-full bg-dds-surface border border-dds-border rounded-md px-4 py-2.5 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50"
                                            />
                                        )}
                                    </div>

                                    {/* Container Name */}
                                    <div>
                                        <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">
                                            Container Name <span className="text-dds-text-muted lowercase tracking-normal text-[10px] ml-1 font-sans">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., my-nginx"
                                            disabled={isSubmitting}
                                            className="w-full bg-dds-surface border border-dds-border rounded-md px-4 py-2.5 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50"
                                        />
                                    </div>

                                    {/* Port Mappings */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">
                                                Port Mappings
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddPort}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-1 text-sm text-dds-primary hover:text-dds-primary/80 transition-colors disabled:opacity-50 font-medium"
                                            >
                                                <Plus size={16} />
                                                Add Port
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {ports.map((port) => (
                                                <div key={port.id} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={port.containerPort}
                                                        onChange={(e) => handlePortChange(port.id, 'containerPort', e.target.value)}
                                                        placeholder="Container port"
                                                        disabled={isSubmitting}
                                                        className="flex-1 bg-dds-surface border border-dds-border rounded-md px-3 py-2 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50"
                                                    />
                                                    <span className="text-dds-text-muted">→</span>
                                                    <input
                                                        type="text"
                                                        value={port.hostPort}
                                                        onChange={(e) => handlePortChange(port.id, 'hostPort', e.target.value)}
                                                        placeholder="Host port"
                                                        disabled={isSubmitting}
                                                        className="flex-1 bg-dds-surface border border-dds-border rounded-md px-3 py-2 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePort(port.id)}
                                                        disabled={isSubmitting}
                                                        className="text-dds-red hover:text-dds-red/80 transition-colors disabled:opacity-50 p-1.5 rounded-md hover:bg-dds-red/10"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Environment Variables */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">
                                                Environment Variables
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddEnvVar}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-1 text-sm text-dds-primary hover:text-dds-primary/80 transition-colors disabled:opacity-50 font-medium"
                                            >
                                                <Plus size={16} />
                                                Add Variable
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {envVars.map((envVar) => (
                                                <div key={envVar.id} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={envVar.key}
                                                        onChange={(e) => handleEnvVarChange(envVar.id, 'key', e.target.value)}
                                                        placeholder="KEY"
                                                        disabled={isSubmitting}
                                                        className="flex-1 bg-dds-surface border border-dds-border rounded-md px-3 py-2 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50"
                                                    />
                                                    <span className="text-dds-text-muted">=</span>
                                                    <input
                                                        type="text"
                                                        value={envVar.value}
                                                        onChange={(e) => handleEnvVarChange(envVar.id, 'value', e.target.value)}
                                                        placeholder="value"
                                                        disabled={isSubmitting}
                                                        className="flex-1 bg-dds-surface border border-dds-border rounded-md px-3 py-2 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEnvVar(envVar.id)}
                                                        disabled={isSubmitting}
                                                        className="text-dds-red hover:text-dds-red/80 transition-colors disabled:opacity-50 p-1.5 rounded-md hover:bg-dds-red/10"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Resource Limits */}
                                    <div className="pt-2">
                                        <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-3">
                                            Resource Limits
                                        </label>

                                        {/* Container limit reached warning */}
                                        {containerFull && (
                                            <div className="mb-3 flex items-center gap-2 bg-dds-red/10 border border-dds-red/30 text-dds-red px-3 py-2.5 rounded-lg text-sm">
                                                <AlertTriangle size={14} className="shrink-0" />
                                                Container limit reached. Remove an existing container to create a new one.
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* CPU Limit */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="flex items-center gap-1.5 text-xs text-dds-text-secondary font-medium">
                                                        <Cpu size={12} /> CPU Limit
                                                    </span>
                                                    <span className="text-[10px] text-dds-text-muted">
                                                        Optional cap
                                                    </span>
                                                </div>
                                                <select
                                                    value={cpuLimit}
                                                    onChange={(e) => setCpuLimit(Number(e.target.value))}
                                                    disabled={isSubmitting}
                                                    className={`w-full bg-dds-surface border border-dds-border rounded-md px-3 py-2 text-dds-text-primary text-[13px] focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50 appearance-none`}
                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                                >
                                                    <option value={0.25}>0.25 cores</option>
                                                    <option value={0.5}>0.5 cores</option>
                                                    <option value={1}>1 core</option>
                                                    <option value={2}>2 cores</option>
                                                </select>
                                            </div>

                                            {/* Memory Limit */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="flex items-center gap-1.5 text-xs text-dds-text-secondary font-medium">
                                                        <HardDrive size={12} /> Memory Limit
                                                    </span>
                                                    <span className="text-[10px] text-dds-text-muted">
                                                        Max memory
                                                    </span>
                                                </div>
                                                <select
                                                    value={memoryLimit}
                                                    onChange={(e) => setMemoryLimit(Number(e.target.value))}
                                                    disabled={isSubmitting}
                                                    className={`w-full bg-dds-surface border border-dds-border rounded-md px-3 py-2 text-dds-text-primary text-[13px] focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50 appearance-none`}
                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                                >
                                                    <option value={64}>64 MB</option>
                                                    <option value={128}>128 MB</option>
                                                    <option value={256}>256 MB</option>
                                                    <option value={512}>512 MB</option>
                                                    <option value={1024}>1024 MB</option>
                                                    <option value={2048}>2048 MB</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Restart Policy */}
                                    <div className="pt-2">
                                        <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <RefreshCw size={13} />
                                            Restart Policy
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <select
                                                    value={restartPolicy}
                                                    onChange={(e) => setRestartPolicy(e.target.value)}
                                                    disabled={isSubmitting}
                                                    className="w-full bg-dds-surface border border-dds-border rounded-md px-3 py-2 text-[13px] text-dds-text-primary focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50 appearance-none"
                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                                >
                                                    <option value="no">None (default)</option>
                                                    <option value="always">Always</option>
                                                    <option value="unless-stopped">Unless Stopped</option>
                                                    <option value="on-failure">On Failure</option>
                                                </select>
                                                <p className="text-[10px] text-dds-text-muted mt-1.5">
                                                    {restartPolicy === 'always' && 'Restarts on any exit, including manual stops.'}
                                                    {restartPolicy === 'unless-stopped' && 'Restarts unless explicitly stopped by the user.'}
                                                    {restartPolicy === 'on-failure' && 'Restarts only on non-zero exit codes.'}
                                                    {restartPolicy === 'no' && 'Container will not be restarted automatically.'}
                                                </p>
                                            </div>
                                            {restartPolicy !== 'no' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-dds-text-secondary mb-1.5">Max Retries</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={100}
                                                        value={maxRetryCount}
                                                        onChange={(e) => setMaxRetryCount(Number(e.target.value))}
                                                        disabled={isSubmitting}
                                                        className="w-full bg-dds-surface border border-dds-border rounded-md px-3 py-2 text-[13px] text-dds-text-primary focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 disabled:opacity-50"
                                                    />
                                                    <p className="text-[10px] text-dds-text-muted mt-1.5">Max restart attempts before stopping</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Auto Start */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <input
                                            type="checkbox"
                                            id="autoStart"
                                            checked={autoStart}
                                            onChange={(e) => setAutoStart(e.target.checked)}
                                            disabled={isSubmitting}
                                            className="w-4 h-4 text-dds-primary bg-dds-surface border-dds-border rounded focus:ring-1 focus:ring-dds-primary/50 disabled:opacity-50"
                                        />
                                        <label htmlFor="autoStart" className="text-[13px] text-dds-text-secondary">
                                            Start container automatically after creation
                                        </label>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-3 p-6 border-t border-dds-border bg-dds-surface/50 mt-auto">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        disabled={isSubmitting}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !image.trim() || containerFull}
                                        className="btn-primary"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin mr-2 inline" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Container'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default CreateContainerModal;
