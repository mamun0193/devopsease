import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { login as reduxLogin, logout as reduxLogout, setAuthStatus } from '../store/authSlice';
import { addToast } from '../store/toastSlice';
import api from '../api';
import { AuthContext } from './AuthContext';
import { useSessionExpiry } from '../hooks/useSessionExpiry';
import { useAuthSync } from '../hooks/useAuthSync';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const dispatch = useDispatch();
    const [user, setUser] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);

    const handleLogout = useCallback(async (showToast = true, broadcast = true) => {
        try {
            await api.post('/auth/logout');
        } catch { /* ignore */ }
        setUser(null);
        setIsAuthenticated(false);
        setExpiresAt(null);
        dispatch(reduxLogout());
        if (showToast) {
            dispatch(addToast({ message: 'Logged out successfully', type: 'info', duration: 3000 }));
        }
    }, [dispatch]);

    const handleSessionExpired = useCallback(() => {
        setUser(null);
        setIsAuthenticated(false);
        setExpiresAt(null);
        dispatch(reduxLogout());
        dispatch(setAuthStatus('expired'));
    }, [dispatch]);

    // Session expiry tracking
    useSessionExpiry(expiresAt, isAuthenticated, handleSessionExpired);

    // Cross-tab sync
    const { broadcast } = useAuthSync(
        // On logout from another tab
        () => {
            setUser(null);
            setIsAuthenticated(false);
            setExpiresAt(null);
            dispatch(reduxLogout());
            dispatch(addToast({ message: 'Logged out from another tab', type: 'info', duration: 4000 }));
        },
        // On session expired from another tab
        () => {
            handleSessionExpired();
            dispatch(addToast({ message: 'Session expired', type: 'warning', duration: 5000 }));
        },
        // On login from another tab
        async () => {
            try {
                const response = await api.get('/auth/me');
                if (response.data.isAuthenticated) {
                    setUser(response.data.user);
                    setIsAuthenticated(true);
                    dispatch(reduxLogin(response.data.user));
                    dispatch(setAuthStatus('active'));
                }
            } catch { /* ignore */ }
        },
    );

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await api.get('/auth/me');
                if (response.data.isAuthenticated) {
                    setUser(response.data.user);
                    setIsAuthenticated(true);
                    dispatch(reduxLogin(response.data.user));
                    dispatch(setAuthStatus('active'));
                    // Estimate expiry from server config (15 min from now on restore)
                    setExpiresAt(Date.now() + 15 * 60 * 1000);
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                    dispatch(reduxLogout());
                }
            } catch {
                setUser(null);
                setIsAuthenticated(false);
                dispatch(reduxLogout());
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [dispatch]);

    const login = async (email: string, password: string, rememberMe: boolean = false) => {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password, rememberMe });
            if (response.data.success) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                setExpiresAt(response.data.expiresAt || Date.now() + 15 * 60 * 1000);
                dispatch(reduxLogin(response.data.user));
                dispatch(setAuthStatus('active'));
                dispatch(addToast({ message: 'Welcome back!', type: 'success', duration: 3000 }));
                broadcast('login');
            }
        } catch (error: any) {
            setUser(null);
            setIsAuthenticated(false);
            dispatch(reduxLogout());

            const data = error.response?.data;
            if (data?.locked) {
                dispatch(addToast({
                    message: `Account temporarily locked. Try again in ${Math.ceil(data.retryAfter / 60)} minutes.`,
                    type: 'error',
                    duration: 8000,
                }));
            } else if (error.response?.status === 429) {
                dispatch(addToast({
                    message: 'Too many attempts. Please slow down.',
                    type: 'warning',
                    duration: 5000,
                }));
            }

            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email: string, password: string, name?: string) => {
        const response = await api.post('/auth/register', { email, password, name });
        if (response.data.success) {
            return response.data.message || 'Account created successfully';
        }
        throw new Error('Registration failed');
    };

    const logout = useCallback(async () => {
        await handleLogout(true, true);
        broadcast('logout');
    }, [handleLogout, broadcast]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
