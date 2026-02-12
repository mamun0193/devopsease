import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration: number;
}

interface ToastState {
    toasts: Toast[];
}

const initialState: ToastState = {
    toasts: [],
};

let nextId = 0;

const toastSlice = createSlice({
    name: 'toast',
    initialState,
    reducers: {
        addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
            state.toasts.push({
                ...action.payload,
                id: `toast_${++nextId}_${Date.now()}`,
            });
        },
        removeToast: (state, action: PayloadAction<string>) => {
            state.toasts = state.toasts.filter(t => t.id !== action.payload);
        },
        clearToasts: (state) => {
            state.toasts = [];
        },
    },
});

export const { addToast, removeToast, clearToasts } = toastSlice.actions;
export default toastSlice.reducer;
