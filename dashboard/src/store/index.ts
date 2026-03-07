import { configureStore } from '@reduxjs/toolkit';
import containersReducer from './containersSlice';
import authReducer from './authSlice';
import toastReducer from './toastSlice';
import alertReducer from './alertSlice';

export const store = configureStore({
  reducer: {
    containers: containersReducer,
    auth: authReducer,
    toast: toastReducer,
    alerts: alertReducer,
  },
  // DevTools enabled by default in development
  devTools: import.meta.env.DEV,
});

// Infer types from store for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
