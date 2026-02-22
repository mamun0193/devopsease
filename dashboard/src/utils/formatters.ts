import type { Container } from '../api';

// Format container name (remove leading slash, clean compose namespace)
export function formatContainerName(name: string): string {
  if (!name) return 'Unknown';
  const cleaned = name.replace(/^\//, '');

  // Detect compose-style name: project_<userId>_<slug>_<service>
  const composeMatch = cleaned.match(/^project_[a-f0-9]+_(.+?)_([^_]+)$/);
  if (composeMatch) {
    const projectSlug = composeMatch[1].replace(/_/g, '-');
    const serviceName = composeMatch[2];
    return `${projectSlug} / ${serviceName}`;
  }

  return cleaned;
}

// Format container ID (truncate to 12 chars)
export function truncateId(id: string): string {
  return id.substring(0, 12);
}

// Get status color based on container state
export function getStatusColor(state: string): string {
  switch (state.toLowerCase()) {
    case 'running':
      return 'var(--status-running)';
    case 'exited':
    case 'dead':
      return 'var(--status-exited)';
    case 'paused':
      return 'var(--status-paused)';
    case 'created':
    case 'restarting':
      return 'var(--status-created)';
    default:
      return 'var(--text-muted)';
  }
}

// Get status background color
export function getStatusBgColor(state: string): string {
  switch (state.toLowerCase()) {
    case 'running':
      return 'var(--status-running-bg)';
    case 'exited':
    case 'dead':
      return 'var(--status-exited-bg)';
    case 'paused':
      return 'var(--status-paused-bg)';
    case 'created':
    case 'restarting':
      return 'var(--status-created-bg)';
    default:
      return 'var(--bg-tertiary)';
  }
}

// Get category color
export function getCategoryColor(category: string | null): string {
  switch (category?.toUpperCase()) {
    case 'RESOURCE':
      return 'var(--category-resource)';
    case 'NETWORK':
      return 'var(--category-network)';
    case 'RUNTIME':
      return 'var(--category-runtime)';
    case 'CONFIGURATION':
      return 'var(--category-configuration)';
    default:
      return 'var(--category-unknown)';
  }
}

// Get confidence color
export function getConfidenceColor(confidence: string): string {
  switch (confidence?.toLowerCase()) {
    case 'high':
      return 'var(--confidence-high)';
    case 'medium':
      return 'var(--confidence-medium)';
    case 'low':
      return 'var(--confidence-low)';
    default:
      return 'var(--text-muted)';
  }
}

// Format timestamp with local timezone
export function formatTimestamp(timestamp: number | string): string {
  const date = typeof timestamp === 'number'
    ? new Date(timestamp * 1000)
    : new Date(timestamp);

  if (isNaN(date.getTime())) return 'N/A';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // Get timezone offset string
  const offset = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset >= 0 ? '+' : '-';
  const tzString = `UTC ${offsetSign}${offsetHours}${offsetMinutes > 0 ? ':' + String(offsetMinutes).padStart(2, '0') : ''}`;

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} (${tzString})`;
}

// Format relative time
export function formatRelativeTime(timestamp: number | string): string {
  const date = typeof timestamp === 'number'
    ? new Date(timestamp * 1000)
    : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
}

// Group containers by state
export function groupContainersByState(containers: Container[]): Record<string, Container[]> {
  return containers.reduce((acc, container) => {
    const state = (container.state?.status || 'unknown').toLowerCase();
    if (!acc[state]) acc[state] = [];
    acc[state].push(container);
    return acc;
  }, {} as Record<string, Container[]>);
}

// Get container stats summary
// Get container stats summary
export function getContainerStats(containers: Container[]): {
  total: number;
  running: number;
  stopped: number;
  paused: number;
} {
  return {
    total: containers.length,
    running: containers.filter(c => c.state?.status?.toLowerCase() === 'running').length,
    stopped: containers.filter(c => ['exited', 'dead'].includes(c.state?.status?.toLowerCase())).length,
    paused: containers.filter(c => c.state?.status?.toLowerCase() === 'paused').length,
  };
}

// Format ports for display
export function formatPorts(ports: any[]): string {
  if (!ports || !Array.isArray(ports) || ports.length === 0) return 'No ports';
  return ports
    .filter(p => p.PublicPort)
    .map(p => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`)
    .join(', ') || 'Internal only';
}

// Format image name (truncate if too long)
export function formatImageName(image: string): string {
  if (image.length > 30) {
    return image.substring(0, 27) + '...';
  }
  return image;
}
