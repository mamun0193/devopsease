import React from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

const cardVariant: Variants = {
    hidden: (col: number) => ({
        opacity: 0,
        y: 10,
    }),
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: 'easeOut' as const },
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
            <div className="flex items-center gap-2 text-dds-text-muted font-medium text-[11px] uppercase tracking-wider mb-3">
                {icon}
                {label}
            </div>

            {variant === 'stat' ? (
                <>
                    <p className="text-2xl font-mono font-medium text-dds-white">
                        {count ?? 0}
                    </p>
                    {stats.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 text-[11px] font-mono flex-wrap">
                            {stats.map((s, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span className="text-dds-border">|</span>}
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

    const baseClass = `card p-4 flex flex-col ${onClick ? 'card-interactive' : ''} ${className}`;

    if (onClick) {
        return (
            <motion.div
                className={baseClass}
                onClick={onClick}
                variants={cardVariant}
                custom={col}
            >
                {inner}
            </motion.div>
        );
    }

    return <motion.div className={baseClass} variants={cardVariant} custom={col}>{inner}</motion.div>;
};

export default OverviewCard;
