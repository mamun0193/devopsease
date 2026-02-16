import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Shield, Clock, CreditCard, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const roleBadge: Record<string, { label: string; color: string; desc: string }> = {
    admin: { label: 'Admin', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', desc: 'Full access to all features' },
    operator: { label: 'Operator', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', desc: 'Can manage containers and perform operations' },
    viewer: { label: 'Viewer', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', desc: 'Read-only access to container information' },
};

const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const badge = roleBadge[user.role] || roleBadge.viewer;

    const initials = (user.name || user.email || '?')
        .split(' ')
        .map((s: string) => s[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const infoItems = [
        { icon: Mail, label: 'Email', value: user.email || user.primaryEmail },
        { icon: Shield, label: 'Role', value: badge.label, extra: badge.desc },
        { icon: CreditCard, label: 'Plan', value: (user.plan || 'free').charAt(0).toUpperCase() + (user.plan || 'free').slice(1) },
        { icon: Clock, label: 'Member since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50 h-16">
                <div className="max-w-3xl mx-auto px-6 h-full flex items-center gap-4">
                    <motion.button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ArrowLeft size={20} />
                    </motion.button>
                    <h1 className="text-lg font-semibold text-white">Profile</h1>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-6 py-10">
                {/* Avatar + Name */}
                <div className="flex items-center gap-5 mb-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-blue-500/20">
                        {initials}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{user.name || user.email?.split('@')[0]}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>
                                {badge.label}
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-sm text-slate-400">{user.email}</span>
                        </div>
                    </div>
                </div>

                {/* Account Info */}
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-slate-800/60">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <UserIcon size={16} className="text-slate-400" />
                            Account Information
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-800/60">
                        {infoItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className="flex items-center justify-between px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <Icon size={16} className="text-slate-500" />
                                        <span className="text-sm text-slate-400">{item.label}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-white font-medium">{item.value}</span>
                                        {item.extra && (
                                            <p className="text-[11px] text-slate-500 mt-0.5">{item.extra}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sign Out */}
                <motion.button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 hover:text-red-300 text-sm font-medium transition-colors"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    <LogOut size={16} />
                    Sign out
                </motion.button>
            </div>
        </div>
    );
};

export default ProfilePage;
