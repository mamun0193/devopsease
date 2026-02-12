import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { removeToast } from '../store/toastSlice';

const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colorMap = {
    success: {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        icon: 'text-emerald-400',
        text: 'text-emerald-300',
    },
    error: {
        bg: 'bg-red-500/15',
        border: 'border-red-500/30',
        icon: 'text-red-400',
        text: 'text-red-300',
    },
    warning: {
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/30',
        icon: 'text-amber-400',
        text: 'text-amber-300',
    },
    info: {
        bg: 'bg-blue-500/15',
        border: 'border-blue-500/30',
        icon: 'text-blue-400',
        text: 'text-blue-300',
    },
};

const ToastItem: React.FC<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration: number;
}> = ({ id, message, type, duration }) => {
    const dispatch = useAppDispatch();
    const Icon = iconMap[type];
    const colors = colorMap[type];

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(removeToast(id));
        }, duration);
        return () => clearTimeout(timer);
    }, [id, duration, dispatch]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md
                border ${colors.bg} ${colors.border} min-w-[280px] max-w-sm
            `}
        >
            <Icon size={18} className={`${colors.icon} shrink-0`} />
            <p className={`text-sm font-medium flex-1 ${colors.text}`}>{message}</p>
            <button
                onClick={() => dispatch(removeToast(id))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors shrink-0"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
};

const Toast: React.FC = () => {
    const toasts = useAppSelector(state => state.toast.toasts);

    return (
        <div className="fixed top-20 right-6 z-[90] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem {...toast} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Toast;
