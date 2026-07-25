import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.devopsease');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
    token: '',
    refreshToken: '',
    baseUrl: 'http://localhost:3497',
    apiPrefix: '/api',
    profile: 'default',
    currentProject: '',
    currentCluster: '',
    currentNamespace: 'default',
};

// Returns the path to the config file.
 
export function getConfigPath() {
    return CONFIG_FILE;
}

// Loads config from disk. Returns defaults if file doesn't exist.
export function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            return { ...DEFAULT_CONFIG };
        }
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

// Merges and saves config to disk.
 
export function saveConfig(data) {
    const current = loadConfig();
    const merged = { ...current, ...data };

    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
}

// Returns the stored access token.
 
export function getToken() {
    return loadConfig().token;
}

// Returns the stored refresh token.
 
export function getRefreshToken() {
    return loadConfig().refreshToken;
}

// Ensures user is authenticated. Throws if no token.
 
export function requireAuth() {
    const token = getToken();
    if (!token) {
        throw new Error('Not logged in. Run `devopsease login` to authenticate.');
    }
    return token;
}

// Returns the current cluster ID from config.
// Throws if none is set.
 
export function requireCluster() {
    const config = loadConfig();
    if (!config.currentCluster) {
        throw new Error(
            'No cluster selected. Run `devopsease cluster use <id>` to select one.'
        );
    }
    return config.currentCluster;
}

// Returns the current namespace from config.
 
export function getNamespace() {
    return loadConfig().currentNamespace || 'default';
}

// Clears all auth tokens from config.
 
export function clearAuth() {
    saveConfig({ token: '', refreshToken: '' });
}
