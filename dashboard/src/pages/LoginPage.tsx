import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Github, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
    const { isAuthenticated, login, register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            const from = (location.state as any)?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const handleOAuthLogin = (provider: 'github' | 'google') => {
        window.location.href = `http://localhost:3497/auth/${provider}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
            } else {
                await register(formData.email, formData.password, formData.name);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-3xl opacity-30 animate-pulse delay-1000"></div>
            </div>

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                        <LayoutDashboard className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-slate-400">
                        {isLogin ? 'Sign in to manage your containers' : 'Get started with DevOpsEase'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    {!isLogin && (
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <input
                                type="text"
                                name="name"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email Address"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Sign Up'}
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-slate-900 text-slate-500">Or continue with</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleOAuthLogin('github')}
                        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl border border-slate-700 transition-all duration-200"
                    >
                        <Github className="h-5 w-5" />
                        <span>GitHub</span>
                    </button>

                    <button
                        onClick={() => handleOAuthLogin('google')}
                        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl border border-slate-700 transition-all duration-200"
                    >
                        <Mail className="h-5 w-5 text-red-500" />
                        <span>Google</span>
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate-400 text-sm">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
