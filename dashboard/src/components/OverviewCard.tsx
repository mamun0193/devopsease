import React from 'react';
import { motion } from 'framer-motion';


const cardVariant = {
    hidden: (col: number) => ({
        opacity: 0,
        x: col === 0 ? -36 : col === 2 ? 36 : 0,
        y: col === 1 ? 24 : 0,
    }),
    visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: { duration: 0.45, ease: 'easeOut' },
    },
};

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
    col?: 0 | 1 | 2;
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
    col = 1,
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
                variants={cardVariant}
                custom={col}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                {inner}
            </motion.div>
        );
    }

    return <motion.div className={`${base} ${className}`} variants={cardVariant} custom={col}>{inner}</motion.div>;
};

export default OverviewCard;
