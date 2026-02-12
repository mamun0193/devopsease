import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setAuthStatus } from '../store/authSlice';
import { addToast } from '../store/toastSlice';
import api from '../api';

/**
 * Tracks access token expiry and triggers silent refresh.
 * Receives expiresAt (epoch ms) and updates when tokens are refreshed.
 */
export function useSessionExpiry(
    expiresAt: number | null,
    isAuthenticated: boolean,
    onSessionExpired: () => void,
) {
    const dispatch = useAppDispatch();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !expiresAt) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(async () => {
            const remaining = expiresAt - Date.now();

            if (remaining <= 0) {
                // Already expired — attempt refresh
                dispatch(setAuthStatus('refreshing'));
                try {
                    await api.post('/auth/refresh');
                    dispatch(setAuthStatus('active'));
                } catch {
                    dispatch(setAuthStatus('expired'));
                    dispatch(addToast({
                        message: 'Session expired. Please log in again.',
                        type: 'warning',
                        duration: 6000,
                    }));
                    onSessionExpired();
                }
                return;
            }

            if (remaining < 60000 && remaining > 55000) {
                // Within 60s — proactively refresh
                dispatch(setAuthStatus('refreshing'));
                try {
                    await api.post('/auth/refresh');
                    dispatch(setAuthStatus('active'));
                } catch {
                    // Will catch on next interval if truly expired
                }
            }
        }, 10000); // Check every 10s

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [expiresAt, isAuthenticated, dispatch, onSessionExpired]);
}
