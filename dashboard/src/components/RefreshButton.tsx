import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  isLoading?: boolean;
  isFetching?: boolean;
  label?: string;
  successLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
  className?: string;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  isLoading = false,
  isFetching = false,
  label = 'Refresh',
  successLabel = 'Refreshed',
  size = 'md',
  variant = 'default',
  showLabel = true,
  className = '',
}) => {
  const [refreshSuccess, setRefreshSuccess] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loading = isLoading || isFetching || isRefreshing;

  // Size variants
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-base gap-2.5',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  // Variant styles with shimmer
  const variantClasses = {
    default: refreshSuccess
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50',
    ghost: refreshSuccess
      ? 'text-emerald-400 hover:bg-emerald-500/10 border-transparent'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent',
    outline: refreshSuccess
      ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'
      : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 hover:bg-slate-800/30',
  };

  return (
    <motion.button
      onClick={handleRefresh}
      disabled={loading}
      className={`
        relative flex items-center justify-center font-medium rounded-lg 
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        border overflow-hidden group
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      whileHover={{ scale: loading ? 1 : 1.02 }}
      whileTap={{ scale: loading ? 1 : 0.98 }}
    >
      {/* Enhanced shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </div>

      {/* Content with AnimatePresence */}
      <div className="relative flex items-center">
        <AnimatePresence mode="wait">
          {refreshSuccess ? (
            <motion.div
              key="success"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex items-center gap-2"
            >
              <Check size={iconSizes[size]} />
              {showLabel && <span>{successLabel}</span>}
            </motion.div>
          ) : (
            <motion.div
              key="refresh"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={loading ? { rotate: 360 } : {}}
                transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              >
                <RefreshCw size={iconSizes[size]} />
              </motion.div>
              {showLabel && <span>{label}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading glow effect */}
      {loading && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.button>
  );
};

export default RefreshButton;
