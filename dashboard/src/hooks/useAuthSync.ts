import { useEffect, useRef } from 'react';

type AuthEvent = 'login' | 'logout' | 'session-expired';

const CHANNEL_NAME = 'devopsease_auth';

/**
 * Cross-tab auth synchronization using BroadcastChannel.
 * Does NOT interfere with existing navigator.locks refresh guard.
 */
export function useAuthSync(
    onLogout: () => void,
    onSessionExpired: () => void,
    onLogin: () => void,
) {
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        try {
            channelRef.current = new BroadcastChannel(CHANNEL_NAME);

            channelRef.current.onmessage = (event: MessageEvent<AuthEvent>) => {
                switch (event.data) {
                    case 'logout':
                        onLogout();
                        break;
                    case 'session-expired':
                        onSessionExpired();
                        break;
                    case 'login':
                        onLogin();
                        break;
                }
            };
        } catch {
            // BroadcastChannel not supported — graceful degradation
        }

        return () => {
            channelRef.current?.close();
        };
    }, [onLogout, onSessionExpired, onLogin]);

    return {
        broadcast: (event: AuthEvent) => {
            try {
                channelRef.current?.postMessage(event);
            } catch {
                // Channel closed or not supported
            }
        },
    };
}
