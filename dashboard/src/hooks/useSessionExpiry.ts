import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setAuthStatus } from '../store/authSlice';
import { addToast } from '../store/toastSlice';
import api from '../api';

const ACCESS_TOKEN_LIFETIME = 15 * 60 * 1000; // 15 min — must match server
const REFRESH_BUFFER = 60_000; // Refresh 60s before expiry

/**
 * Tracks access token expiry and triggers silent refresh.
 * After a successful refresh, resets expiresAt so the cycle continues indefinitely.
 */
export function useSessionExpiry(
    expiresAt: number | null,
    isAuthenticated: boolean,
    onSessionExpired: () => void,
    onExpiresAtUpdated: (newExpiresAt: number) => void,
) {
    const dispatch = useAppDispatch();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRefreshingRef = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || !expiresAt) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const scheduleCheck = () => {
            if (timerRef.current) clearTimeout(timerRef.current);

            const remaining = expiresAt - Date.now();

            if (remaining <= 0) {
                // Already expired — attempt refresh immediately
                doRefresh();
                return;
            }

            // Schedule refresh for REFRESH_BUFFER before expiry
            const refreshIn = Math.max(remaining - REFRESH_BUFFER, 0);
            timerRef.current = setTimeout(doRefresh, refreshIn);
        };

        const doRefresh = async () => {
            if (isRefreshingRef.current) return;
            isRefreshingRef.current = true;

            dispatch(setAuthStatus('refreshing'));
            try {
                const response = await api.post('/auth/refresh');
                const newExpiresAt = response.data.expiresAt || (Date.now() + ACCESS_TOKEN_LIFETIME);
                onExpiresAtUpdated(newExpiresAt);
                dispatch(setAuthStatus('active'));
            } catch {
                dispatch(setAuthStatus('expired'));
                dispatch(addToast({
                    message: 'Session expired. Please log in again.',
                    type: 'warning',
                    duration: 6000,
                }));
                onSessionExpired();
            } finally {
                isRefreshingRef.current = false;
            }
        };

        scheduleCheck();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [expiresAt, isAuthenticated, dispatch, onSessionExpired, onExpiresAtUpdated]);
}
