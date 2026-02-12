import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

export type UserRole = 'operator' | 'admin';

interface RoleContextType {
    role: UserRole;
    isAdmin: boolean;
    isOperator: boolean;
    isViewer: boolean; // kept for backward compat — always false now
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();

    const role: UserRole = user?.role === 'admin' ? 'admin' : 'operator';
    const isAdmin = role === 'admin';
    const isOperator = role === 'operator';
    const isViewer = false; // No viewer role — all logged-in users can operate

    return (
        <RoleContext.Provider value={{ role, isAdmin, isOperator, isViewer }}>
            {children}
        </RoleContext.Provider>
    );
};

export const useRole = () => {
    const context = useContext(RoleContext);
    if (context === undefined) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
};
