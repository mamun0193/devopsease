import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Github, Lock, User, ArrowRight, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDispatch } from 'react-redux';
import { addToast } from '../store/toastSlice';

const LoginPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [form, setForm] = useState({ email: '', password: '', name: '' });
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, register, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    const API_BASE = 'http://localhost:3497';

    const handleOAuthLogin = (provider: 'github' | 'google') => {
        window.location.href = `${API_BASE}/auth/${provider}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            if (isLogin) {
                await login(form.email, form.password, rememberMe);
                // Login success is handled by AuthProvider (sets isAuthenticated → useEffect redirect)
            } else {
                const message = await register(form.email, form.password, form.name || undefined);
                dispatch(addToast({ message: message || 'Account created!', type: 'success', duration: 4000 }));
                // Switch to login tab so user can sign in
                setIsLogin(true);
                setForm(prev => ({ ...prev, password: '' }));
                setError('');
            }
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.locked) {
                setError(`Account temporarily locked. Try again in ${Math.ceil(data.retryAfter / 60)} minutes.`);
            } else if (err.response?.status === 429) {
                setError('Too many attempts. Please slow down.');
            } else {
                setError(data?.message || 'An error occurred');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                        <LayoutDashboard className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">DevOpsEase</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {isLogin ? 'Sign in to your account' : 'Create a new account'}
                    </p>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-8">
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Your name"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Remember Me — login only */}
                        {isLogin && (
                            <div className="flex items-center">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div
                                        className={`
                                            w-8 h-[18px] rounded-full relative transition-colors duration-200
                                            ${rememberMe ? 'bg-blue-500' : 'bg-slate-700'}
                                        `}
                                        onClick={() => setRememberMe(!rememberMe)}
                                    >
                                        <div
                                            className={`
                                                absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-200
                                                ${rememberMe ? 'translate-x-[16px]' : 'translate-x-[2px]'}
                                            `}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors select-none">
                                        Remember me
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign in' : 'Create account'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-800" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 text-xs text-slate-500 bg-slate-900/60">
                                or continue with
                            </span>
                        </div>
                    </div>

                    {/* OAuth */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleOAuthLogin('github')}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-white text-sm font-medium transition-colors duration-200"
                        >
                            <Github size={18} />
                            GitHub
                        </button>
                        <button
                            onClick={() => handleOAuthLogin('google')}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-white text-sm font-medium transition-colors duration-200"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.43l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>
                    </div>
                </div>

                {/* Toggle */}
                <p className="text-center mt-6 text-sm text-slate-400">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
