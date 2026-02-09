import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'viewer' | 'operator';

interface RoleContextType {
    role: UserRole;
    setRole: (role: UserRole) => void;
    isOperator: boolean;
    isViewer: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize from localStorage or default to 'operator'
    const [role, setRoleState] = useState<UserRole>(() => {
        const savedRole = localStorage.getItem('devopsease_role');
        return (savedRole as UserRole) || 'operator';
    });

    const setRole = (newRole: UserRole) => {
        setRoleState(newRole);
        localStorage.setItem('devopsease_role', newRole);
    };

    const isOperator = role === 'operator';
    const isViewer = role === 'viewer';

    return (
        <RoleContext.Provider value={{ role, setRole, isOperator, isViewer }}>
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
