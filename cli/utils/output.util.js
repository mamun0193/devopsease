import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

// ── Status color mapping ──

const STATUS_COLORS = {
    running: 'green',
    active: 'green',
    connected: 'green',
    success: 'green',
    completed: 'green',
    healthy: 'green',
    ready: 'green',
    verified: 'green',
    paused: 'gray',
    archived: 'gray',

    deploying: 'cyan',
    pending: 'cyan',
    pending_verification: 'cyan',
    provisioning: 'cyan',
    building: 'cyan',
    'in-progress': 'cyan',

    failed: 'red',
    error: 'red',
    crashed: 'red',
    terminated: 'red',
    expired: 'red',
    'CrashLoopBackOff': 'red',

    stopped: 'yellow',
    inactive: 'yellow',
    warning: 'yellow',
    unknown: 'yellow',
    'ImagePullBackOff': 'yellow',
};

// Returns a color-coded status string.
 
export function statusColor(status) {
    const normalized = String(status || 'unknown');
    const color = STATUS_COLORS[normalized] || 'white';
    return chalk[color](normalized);
}

// Prints a formatted table.
 
export function printTable(headers, rows) {
    const table = new Table({
        head: headers.map((h) => chalk.cyan.bold(h)),
        style: {
            head: [],
            border: ['gray'],
        },
        chars: {
            top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
            bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
            left: '│', 'left-mid': '├',
            mid: '─', 'mid-mid': '┼',
            right: '│', 'right-mid': '┤',
            middle: '│',
        },
    });

    for (const row of rows) {
        table.push(row);
    }

    console.log(table.toString());
}

// Success message.
 
export function success(msg) {
    if (process.argv.includes('--json')) return;
    console.log(chalk.green(`✔ ${msg}`));
}

// Error message.
 
export function error(msg) {
    if (process.argv.includes('--json')) {
        console.error(JSON.stringify({ error: msg }));
        process.exit(1);
    }
    console.error(chalk.red(`✖ ${msg}`));
    process.exit(1);
}

// Warning message.
 
export function warn(msg) {
    if (process.argv.includes('--json')) return;
    console.log(chalk.yellow(`⚠ ${msg}`));
}

// Info message.
 
export function info(msg) {
    if (process.argv.includes('--json')) return;
    console.log(chalk.blue(`ℹ ${msg}`));
}

// Dim/muted text.
 
export function dim(msg) {
    if (process.argv.includes('--json')) return;
    console.log(chalk.dim(msg));
}

// Bold heading.
 
export function heading(msg) {
    if (process.argv.includes('--json')) return;
    console.log(chalk.bold.white(`\n${msg}`));
    console.log(chalk.dim('─'.repeat(msg.length + 2)));
}

// Wraps an async function with an ora spinner.
 
export async function withSpinner(label, asyncFn) {
    if (process.argv.includes('--json')) {
        return await asyncFn({ succeed: () => {}, fail: () => {} });
    }
    const spinner = ora({ text: label, color: 'cyan' }).start();
    try {
        const result = await asyncFn(spinner);
        spinner.succeed();
        return result;
    } catch (err) {
        spinner.fail(err.message);
        throw err;
    }
}

// If --json flag is set, print raw JSON and exit.
// Otherwise return false so the caller can do custom formatting.
 
export function handleJsonOutput(opts, data) {
    if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
        return true;
    }
    return false;
}

// Formats a date string into a human-readable relative time or short date.
 
export function formatDate(dateStr) {
    if (!dateStr) return chalk.dim('—');
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Truncates a string to maxLen, adding … if trimmed.
 
export function truncate(str, maxLen = 32) {
    const s = String(str || '');
    return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}
