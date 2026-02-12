
import React, { createContext, useContext } from 'react';

export interface AuthContextType {
    user: any;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    login: async () => { },
    register: async () => { },
});

export const useAuth = () => useContext(AuthContext);
