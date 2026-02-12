import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface User {
    _id: string;
    primaryEmail: string;
    role: 'viewer' | 'operator' | 'admin';
    plan: 'free' | 'pro';
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    status: 'active' | 'refreshing' | 'expired';
}

const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    status: 'expired',
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action: PayloadAction<User>) => {
            state.isAuthenticated = true;
            state.user = action.payload;
            state.status = 'active';
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.status = 'expired';
        },
        setAuthStatus: (state, action: PayloadAction<AuthState['status']>) => {
            state.status = action.payload;
        },
    },
});

export const { login, logout, setAuthStatus } = authSlice.actions;
export default authSlice.reducer;
