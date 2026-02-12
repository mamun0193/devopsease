import { configureStore } from '@reduxjs/toolkit';
import containersReducer from './containersSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    containers: containersReducer,
    auth: authReducer,
  },
  // DevTools enabled by default in development
  devTools: import.meta.env.DEV,
});

// Infer types from store for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
