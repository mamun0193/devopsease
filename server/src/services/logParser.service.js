/**
 * Server-side log parsing service
 * Parses container logs and adds timestamps, levels, and explanations
 */

// Get user's timezone offset string (e.g., "UTC +5:30")
function getTimezoneString() {
  const offset = -new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';
  return `UTC ${sign}${hours}${minutes > 0 ? ':' + String(minutes).padStart(2, '0') : ''}`;
}

// Format timestamp to user-friendly format: DD-MM-YYYY HH:MM:SS (UTC +X)
function formatTimestamp(timestamp) {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return null;
  }
}

// Log patterns with explanations
const LOG_PATTERNS = [
  // Connection errors
  {
    pattern: /ECONNREFUSED|connection refused/i,
    level: 'error',
    explanation: '🔌 Connection Refused: The app tried to connect to another service (like a database or API), but that service is not running or not accepting connections.',
    isImportant: true,
  },
  {
    pattern: /ECONNRESET|connection reset/i,
    level: 'error',
    explanation: '🔌 Connection Reset: The connection was unexpectedly closed by the other side.',
    isImportant: true,
  },
  {
    pattern: /ETIMEDOUT|connection timed out|timeout/i,
    level: 'error',
    explanation: '⏱️ Timeout: The app waited too long for a response and gave up.',
    isImportant: true,
  },
  {
    pattern: /EADDRINUSE|address already in use|port.*in use/i,
    level: 'error',
    explanation: '🚫 Port Already in Use: Another program is already using this network port.',
    isImportant: true,
  },
  {
    pattern: /out of memory|OOM|heap out of memory|ENOMEM/i,
    level: 'error',
    explanation: '💾 Out of Memory: The container ran out of RAM.',
    isImportant: true,
  },
  {
    pattern: /Cannot find module|MODULE_NOT_FOUND|module not found/i,
    level: 'error',
    explanation: '📦 Missing Module: A required package is not installed.',
    isImportant: true,
  },
  {
    pattern: /ENOENT|no such file or directory/i,
    level: 'error',
    explanation: '📁 File Not Found: The app tried to access a file or folder that doesn\'t exist.',
    isImportant: true,
  },
  {
    pattern: /EACCES|permission denied|access denied/i,
    level: 'error',
    explanation: '🔒 Permission Denied: The app doesn\'t have permission to access a file or resource.',
    isImportant: true,
  },
  {
    pattern: /invalid.*length.*startup.*packet/i,
    level: 'warning',
    explanation: '📡 Startup Packet Error: A client tried to connect with an invalid connection request. This can happen with port scanners or misconfigured clients.',
    isImportant: false,
  },
  {
    pattern: /database.*error|db.*error|mysql.*error|postgres.*error|mongodb.*error|redis.*error/i,
    level: 'error',
    explanation: '🗄️ Database Error: Something went wrong with the database.',
    isImportant: true,
  },
  {
    pattern: /UnhandledPromiseRejection|unhandled.*rejection/i,
    level: 'error',
    explanation: '⚠️ Unhandled Promise: A JavaScript promise failed and wasn\'t properly handled.',
    isImportant: true,
  },
  {
    pattern: /TypeError|ReferenceError|SyntaxError/i,
    level: 'error',
    explanation: '🐛 Code Error: There\'s a bug in the code.',
    isImportant: true,
  },
  {
    pattern: /\b(4\d{2}|5\d{2})\b.*error|HTTP.*error|status code (4|5)\d{2}/i,
    level: 'error',
    explanation: '🌐 HTTP Error: A web request failed.',
    isImportant: true,
  },
  {
    pattern: /authentication failed|unauthorized|invalid.*token|invalid.*credentials/i,
    level: 'error',
    explanation: '🔑 Authentication Failed: Login credentials are wrong or the access token is invalid.',
    isImportant: true,
  },
  {
    pattern: /\berror\b|\bfailed\b|\bfailure\b|\bexception\b/i,
    level: 'error',
    explanation: '❌ Error: Something went wrong during execution.',
    isImportant: true,
  },
  // Warnings
  {
    pattern: /\bwarn(ing)?\b/i,
    level: 'warning',
    explanation: '⚠️ Warning: Not critical right now, but something should be addressed.',
    isImportant: false,
  },
  {
    pattern: /deprecated/i,
    level: 'warning',
    explanation: '📅 Deprecated: This feature is outdated and will be removed in a future version.',
    isImportant: false,
  },
  {
    pattern: /retry|retrying/i,
    level: 'warning',
    explanation: '🔄 Retry: The operation failed and is being attempted again.',
    isImportant: false,
  },
  // Success patterns
  {
    pattern: /listening on port\s*(\d+)|server.*port\s*(\d+)/i,
    level: 'success',
    explanation: '🚀 Server Started: Your application is now running and accepting connections.',
    isImportant: true,
  },
  {
    pattern: /server.*running|server.*started/i,
    level: 'success',
    explanation: '🚀 Server Started: The server process has initialized successfully.',
    isImportant: true,
  },
  {
    pattern: /connected to (database|db|mongodb|mysql|postgres|redis)/i,
    level: 'success',
    explanation: '🗄️ Database Connected: Successfully established connection to the database.',
    isImportant: true,
  },
  {
    pattern: /connection established|connected successfully/i,
    level: 'success',
    explanation: '✅ Connection Established: Successfully connected to the target service.',
    isImportant: true,
  },
  {
    pattern: /\bready\b/i,
    level: 'success',
    explanation: '✅ Ready: The service has finished initializing and is ready.',
    isImportant: true,
  },
  {
    pattern: /health check passed|healthy/i,
    level: 'success',
    explanation: '💚 Health Check Passed: The service is healthy and functioning normally.',
    isImportant: true,
  },
  // Info patterns - HTTP requests
  {
    pattern: /\bGET\s+\/[^\s]*/i,
    level: 'info',
    explanation: '📥 HTTP GET: Request to retrieve data from this endpoint.',
    isImportant: false,
  },
  {
    pattern: /\bPOST\s+\/[^\s]*/i,
    level: 'info',
    explanation: '📤 HTTP POST: Request to create or submit data.',
    isImportant: false,
  },
  {
    pattern: /\bPUT\s+\/[^\s]*/i,
    level: 'info',
    explanation: '📝 HTTP PUT: Request to update existing data.',
    isImportant: false,
  },
  {
    pattern: /\bDELETE\s+\/[^\s]*/i,
    level: 'info',
    explanation: '🗑️ HTTP DELETE: Request to remove data.',
    isImportant: false,
  },
  {
    pattern: /checkpoint.*complete|checkpoint/i,
    level: 'info',
    explanation: '💾 Database Checkpoint: Database is saving data to disk for durability.',
    isImportant: false,
  },
  {
    pattern: /LOG:|INFO:|log:/i,
    level: 'info',
    explanation: '📋 Log Entry: General application log message.',
    isImportant: false,
  },
];

// Clean Docker log line - remove stream header bytes and control characters
function cleanLogLine(line) {
  // Docker multiplexed stream can have header bytes - strip non-printable chars from start
  // Also handles cases like 'p2026-...' where there's a stray character
  return line.replace(/^[\x00-\x1f\x7f-\x9f]+/, '').replace(/^[^0-9\[a-zA-Z]*/, '');
}

// Extract timestamp from various log formats
function extractTimestamp(line) {
  // First, clean the line of any Docker stream artifacts
  const cleanedLine = cleanLogLine(line);
  
  const patterns = [
    // Docker timestamp format: 2026-01-31T16:03:28.353123456Z (nanoseconds)
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s*/,
    // ISO format with T: 2026-01-31T16:03:28.353Z
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s*/,
    // PostgreSQL/Database format: 2026-01-31 16:03:28.353 UTC [651]
    /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?\s*(?:UTC)?)\s*(?:\[\d+\])?\s*/,
    // Bracketed format: [2026-01-31 16:03:28]
    /^\[(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]\s*/,
    // Simple time at start: 16:03:28
    /^(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*/,
  ];
  
  for (const pattern of patterns) {
    const match = cleanedLine.match(pattern);
    if (match) {
      const rawTimestamp = match[1];
      const formatted = formatTimestamp(rawTimestamp);
      return {
        raw: rawTimestamp,
        formatted: formatted,
        rest: cleanedLine.substring(match[0].length).trim()
      };
    }
  }
  
  return { raw: null, formatted: null, rest: cleanedLine };
}

// Parse a single log line
function parseLogLine(line, index) {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return null;
  }

  // Extract timestamp
  const { raw: rawTimestamp, formatted: formattedTimestamp, rest: messageWithoutTimestamp } = extractTimestamp(trimmedLine);

  // Find matching pattern
  for (const logPattern of LOG_PATTERNS) {
    if (logPattern.pattern.test(messageWithoutTimestamp)) {
      return {
        id: index,
        timestamp: formattedTimestamp,
        timezone: getTimezoneString(),
        level: logPattern.level,
        message: messageWithoutTimestamp,
        rawLine: trimmedLine,
        explanation: logPattern.explanation,
        isImportant: logPattern.isImportant,
        hasDetails: true,
      };
    }
  }

  // Default to info
  return {
    id: index,
    timestamp: formattedTimestamp,
    timezone: getTimezoneString(),
    level: 'info',
    message: messageWithoutTimestamp,
    rawLine: trimmedLine,
    explanation: '📋 Log Entry: General application output.',
    isImportant: false,
    hasDetails: true,
  };
}

// Parse all logs
export function parseLogs(logText) {
  if (!logText) return { logs: [], stats: { total: 0, errors: 0, warnings: 0, info: 0, success: 0 } };
  
  const lines = logText.split('\n');
  const logs = lines
    .map((line, index) => parseLogLine(line, index))
    .filter(log => log !== null);

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length,
    success: logs.filter(l => l.level === 'success').length,
  };

  return { logs, stats };
}

export default { parseLogs };
