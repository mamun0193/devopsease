import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Alert } from '../api/alerts';

interface AlertState {
  alerts: Alert[];
  unresolvedCount: number;
  isLoading: boolean;
}

const initialState: AlertState = {
  alerts: [],
  unresolvedCount: 0,
  isLoading: false,
};

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setAlerts: (state, action: PayloadAction<Alert[]>) => {
      state.alerts = action.payload;
    },
    addAlert: (state, action: PayloadAction<Alert>) => {
      // Prepend new alert (most recent first)
      state.alerts = [action.payload, ...state.alerts];
      if (!action.payload.resolved) {
        state.unresolvedCount += 1;
      }
    },
    markResolved: (state, action: PayloadAction<string>) => {
      const alert = state.alerts.find(a => a._id === action.payload);
      if (alert && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = new Date().toISOString();
        state.unresolvedCount = Math.max(0, state.unresolvedCount - 1);
      }
    },
    markAllResolved: (state) => {
      for (const alert of state.alerts) {
        if (!alert.resolved) {
          alert.resolved = true;
          alert.resolvedAt = new Date().toISOString();
        }
      }
      state.unresolvedCount = 0;
    },
    setUnresolvedCount: (state, action: PayloadAction<number>) => {
      state.unresolvedCount = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setAlerts,
  addAlert,
  markResolved,
  markAllResolved,
  setUnresolvedCount,
  setLoading,
} = alertSlice.actions;

export default alertSlice.reducer;
