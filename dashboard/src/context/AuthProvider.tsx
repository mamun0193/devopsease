import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { login as reduxLogin, logout as reduxLogout } from '../store/authSlice';
import api from '../api';
import { AuthContext } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const dispatch = useDispatch();
    const [user, setUser] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await api.get('/auth/me');
                if (response.data.isAuthenticated) {
                    setUser(response.data.user);
                    setIsAuthenticated(true);
                    dispatch(reduxLogin(response.data.user));
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                    dispatch(reduxLogout());
                }
            } catch (error) {
                // Should not happen with new middleware, but safe fallback
                setUser(null);
                setIsAuthenticated(false);
                dispatch(reduxLogout());
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [dispatch]); // Added dispatch to dependency array

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            if (response.data.success) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                dispatch(reduxLogin(response.data.user)); // Update Redux state
            }
        } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
            dispatch(reduxLogout()); // Update Redux state
            throw error; // Re-throw to allow error handling in components
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email: string, password: string, name?: string) => {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/register', { email, password, name });
            if (response.data.success) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                dispatch(reduxLogin(response.data.user)); // Update Redux state
            }
        } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
            dispatch(reduxLogout()); // Update Redux state
            throw error; // Re-throw to allow error handling in components
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
