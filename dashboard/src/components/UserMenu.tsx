import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const planBadge: Record<string, { label: string; color: string }> = {
    free: { label: 'Free', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    pro: { label: 'Pro', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    premium: { label: 'Premium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

const UserMenu: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!user) return null;

    const initials = (user.name || user.email || '?')
        .split(' ')
        .map((s: string) => s[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const badge = planBadge[user.plan] || planBadge.free;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
            >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {initials}
                </div>
                <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-slate-800">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-white truncate">
                                    {user.name || 'User'}
                                </p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badge.color} leading-tight font-medium`}>
                                    {badge.label}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                        </div>

                        {/* Menu items */}
                        <div className="py-1">
                            <button
                                onClick={() => { setOpen(false); navigate('/profile'); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                                <User size={16} />
                                Profile
                            </button>
                            <button
                                onClick={() => { setOpen(false); navigate('/profile'); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                                <Shield size={16} />
                                Security
                            </button>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-slate-800 py-1">
                            <button
                                onClick={() => { setOpen(false); logout(); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                            >
                                <LogOut size={16} />
                                Sign out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserMenu;
