import React from 'react';
import { motion } from 'framer-motion';

export interface OverviewStatLine {
    text: string;
    colorClass: string;
    icon?: React.ReactNode;
}

interface OverviewCardProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    variant?: 'stat' | 'status';
    count?: number | string;
    stats?: OverviewStatLine[];
    statusNode?: React.ReactNode;
    className?: string;
}

const base =
    'bg-slate-900 border border-slate-800 rounded-xl p-5 transition-colors';

const OverviewCard: React.FC<OverviewCardProps> = ({
    icon,
    label,
    onClick,
    variant = 'stat',
    count,
    stats = [],
    statusNode,
    className = '',
}) => {
    const inner = (
        <>
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                {icon}
                {label}
            </div>

            {variant === 'stat' ? (
                <>
                    <p className="text-2xl font-bold text-slate-100">
                        {count ?? 0}
                    </p>
                    {stats.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                            {stats.map((s, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span className="text-slate-600">·</span>}
                                    <span className={`flex items-center gap-1 ${s.colorClass}`}>
                                        {s.icon}
                                        {s.text}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="flex items-center gap-2 mt-1">{statusNode}</div>
            )}
        </>
    );

    if (onClick) {
        return (
            <motion.div
                className={`${base} cursor-pointer hover:border-slate-700 ${className}`}
                onClick={onClick}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                {inner}
            </motion.div>
        );
    }

    return <div className={`${base} ${className}`}>{inner}</div>;
};

export default OverviewCard;
