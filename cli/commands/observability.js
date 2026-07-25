import { Command } from 'commander';
import { apiGet } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerObservabilityCommands(program) {
    const observeCmd = program.command('observe').description('Platform observability and metrics');

    observeCmd
        .command('health')
        .description('View platform health')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching platform health...', () => apiGet('/health')); // Note: backend uses /api/health for platform health

                if (handleJsonOutput(opts, data)) return;

                heading('Platform Health');
                info(`Status: ${statusColor(data.status || 'unknown')}`);
                info(`Uptime: ${data.uptime ? `${(data.uptime / 3600).toFixed(2)} hours` : '—'}`);
                if (data.components) {
                    console.log('\nComponents:');
                    for (const [name, status] of Object.entries(data.components)) {
                        console.log(`  ${name.padEnd(15)} ${statusColor(status)}`);
                    }
                }
            } catch (err) {
                error(err.message);
            }
        });

    observeCmd
        .command('events')
        .description('List recent platform events')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching events...', () => apiGet('/observability/events/recent'));

                if (handleJsonOutput(opts, data)) return;

                const events = data.events || data.data || [];
                if (!events.length) {
                    info('No recent events found.');
                    return;
                }

                printTable(
                    ['Type', 'Message', 'Source', 'Time'],
                    events.map((e) => [
                        e.type || 'info',
                        truncate(e.message, 40),
                        e.source || 'system',
                        formatDate(e.timestamp || e.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    observeCmd
        .command('metrics')
        .description('View platform metrics summary')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching metrics...', () => apiGet('/metrics'));

                if (handleJsonOutput(opts, data)) return;

                heading('Platform Metrics');
                if (data.data) {
                    for (const [key, value] of Object.entries(data.data)) {
                        if (typeof value !== 'object') {
                            info(`${key.padEnd(20)}: ${value}`);
                        }
                    }
                } else {
                    for (const [key, value] of Object.entries(data)) {
                        if (typeof value !== 'object' && key !== 'success') {
                            info(`${key.padEnd(20)}: ${value}`);
                        }
                    }
                }
            } catch (err) {
                error(err.message);
            }
        });
}
