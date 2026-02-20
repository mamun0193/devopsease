import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Package, PenLine } from 'lucide-react';
import { useAppDispatch } from '../store/hooks';
import { createContainer } from '../store/containersSlice';
import { useQueryClient } from '@tanstack/react-query';
import { buildApi } from '../api';
import type { BuiltImage } from '../api';

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
            }));

            if (!result.type.endsWith('/rejected')) {
                queryClient.invalidateQueries({ queryKey: ['containers'] });
                queryClient.invalidateQueries({ queryKey: ['actions'] });

                setImage('');
                setName('');
                setPorts([]);
                setEnvVars([]);
                setAutoStart(true);
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
            setImageSource('built');
            setError(null);
            onClose();
        }
    };

    return (
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
                            className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-700">
                                <h2 className="text-xl font-semibold text-white">Create Container</h2>
                                <button
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                                <div className="p-6 space-y-6">
                                    {/* Error Message */}
                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                                            {error}
                                        </div>
                                    )}

                                    {/* Image Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Image <span className="text-red-400">*</span>
                                        </label>

                                        {/* Source tabs */}
                                        <div className="flex gap-1 mb-3 bg-slate-800/50 rounded-lg p-1">
                                            <button
                                                type="button"
                                                onClick={() => { setImageSource('built'); setImage(''); }}
                                                disabled={isSubmitting}
                                                className={`flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${imageSource === 'built'
                                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                    : 'text-slate-400 hover:text-slate-300'
                                                    }`}
                                            >
                                                <Package size={13} />
                                                My Images
                                                {builtImages.length > 0 && (
                                                    <span className="ml-auto text-[10px] bg-slate-700/60 px-1.5 py-0.5 rounded-full">
                                                        {builtImages.length}
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setImageSource('custom'); setImage(''); }}
                                                disabled={isSubmitting}
                                                className={`flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${imageSource === 'custom'
                                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                    : 'text-slate-400 hover:text-slate-300'
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
                                                    <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                                                        <Loader2 size={14} className="animate-spin" /> Loading images…
                                                    </div>
                                                ) : builtImages.length === 0 ? (
                                                    <div className="text-sm text-slate-500 bg-slate-800/40 border border-slate-700/50 rounded-lg px-4 py-3">
                                                        No built images yet. Build an image first or use a custom image name.
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={image}
                                                        onChange={(e) => setImage(e.target.value)}
                                                        disabled={isSubmitting}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 appearance-none cursor-pointer"
                                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                                    >
                                                        <option value="" className="bg-slate-800 text-slate-400">Select a built image…</option>
                                                        {builtImages.map(img => (
                                                            <option key={img._id} value={img.tag} className="bg-slate-800 text-white">
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
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                            />
                                        )}
                                    </div>

                                    {/* Container Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Container Name (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., my-nginx"
                                            disabled={isSubmitting}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                    </div>

                                    {/* Port Mappings */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-slate-300">
                                                Port Mappings
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddPort}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
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
                                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                    />
                                                    <span className="text-slate-500">→</span>
                                                    <input
                                                        type="text"
                                                        value={port.hostPort}
                                                        onChange={(e) => handlePortChange(port.id, 'hostPort', e.target.value)}
                                                        placeholder="Host port"
                                                        disabled={isSubmitting}
                                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePort(port.id)}
                                                        disabled={isSubmitting}
                                                        className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
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
                                            <label className="block text-sm font-medium text-slate-300">
                                                Environment Variables
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddEnvVar}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
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
                                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                    />
                                                    <span className="text-slate-500">=</span>
                                                    <input
                                                        type="text"
                                                        value={envVar.value}
                                                        onChange={(e) => handleEnvVarChange(envVar.id, 'value', e.target.value)}
                                                        placeholder="value"
                                                        disabled={isSubmitting}
                                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEnvVar(envVar.id)}
                                                        disabled={isSubmitting}
                                                        className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Auto Start */}
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="autoStart"
                                            checked={autoStart}
                                            onChange={(e) => setAutoStart(e.target.checked)}
                                            disabled={isSubmitting}
                                            className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-700 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                        <label htmlFor="autoStart" className="text-sm text-slate-300">
                                            Start container automatically after creation
                                        </label>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !image.trim()}
                                        className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
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
        </AnimatePresence>
    );
};

export default CreateContainerModal;
