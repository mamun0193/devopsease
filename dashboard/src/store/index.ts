import { configureStore } from '@reduxjs/toolkit';
import containersReducer from './containersSlice';

export const store = configureStore({
  reducer: {
    containers: containersReducer,
  },
  // DevTools enabled by default in development
  devTools: import.meta.env.DEV,
});

// Infer types from store for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
