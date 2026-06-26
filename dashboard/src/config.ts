// ---- Centralized application configuration----

// Backend API base URL (REST).
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3497';

// Backend WebSocket base URL.
export const WS_BASE_URL: string =
  import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3497';

// Gateway base URL for proxied application access.
export const GATEWAY_BASE_URL: string =
  import.meta.env.VITE_GATEWAY_BASE_URL || '';

// Build a gateway URL for an application slug.

export function getGatewayUrl(slug: string): string {
  const base = GATEWAY_BASE_URL || window.location.origin;
  return `${base}/apps/${slug}`;
}

// Build a WebSocket URL from a path.

export function buildWsUrl(path: string): string {
  return `${WS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
}
