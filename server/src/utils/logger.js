const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'cert', 'private_key'];

const redactSecrets = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSecrets);

  const redacted = { ...obj };
  for (const key in redacted) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSecrets(redacted[key]);
    }
  }
  return redacted;
};

const log = (level, message, meta = {}) => {
  console.log(
    JSON.stringify({
      level,
      message,
      ...redactSecrets(meta),
      timestamp: new Date().toISOString(),
    })
  );
};

export default {
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
  debug: (msg, meta) => {
    if (process.env.LOG_DEBUG === "true") log("debug", msg, meta);
  },
};