import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, info,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerTunnelCommands(program) {
    const tunnel = program.command('tunnel').description('Manage public tunnels');

    // ── tunnel list ──
    tunnel
        .command('list')
        .description('List active tunnels')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching tunnels...', () =>
                    apiGet('/tunnels')
                );

                if (handleJsonOutput(opts, data)) return;

                const tunnels = data.tunnels || data.data || [];
                if (!tunnels.length) {
                    error('No active tunnels. Create one with `devopsease tunnel create`.');
                    return;
                }

                printTable(
                    ['ID', 'URL', 'Container', 'Port', 'Status', 'Expires'],
                    tunnels.map((t) => [
                        truncate(t._id || t.id, 12),
                        t.url || '—',
                        truncate(t.containerId, 12) || '—',
                        String(t.port || '—'),
                        statusColor(t.status || 'active'),
                        formatDate(t.expiresAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // ── tunnel create ──
    tunnel
        .command('create')
        .description('Create a public tunnel to a container')
        .action(async () => {
            try {
                requireAuth();

                // Fetch containers for selection
                const containerData = await apiGet('/containers');
                const containers = containerData.data || [];
                if (!containers.length) {
                    error('No containers found. Create one first.');
                    return;
                }

                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'containerId',
                        message: 'Select container:',
                        choices: containers.map((c) => ({
                            name: `${c.name || truncate(c.id, 12)} (${c.state})`,
                            value: c.id,
                        })),
                    },
                    {
                        type: 'input',
                        name: 'port',
                        message: 'Container port to expose:',
                        validate: (v) => {
                            const n = parseInt(v, 10);
                            return (n > 0 && n <= 65535) || 'Enter a valid port (1-65535)';
                        },
                    },
                ]);

                const data = await withSpinner('Creating tunnel...', () =>
                    apiPost('/tunnels', {
                        containerId: answers.containerId,
                        port: parseInt(answers.port, 10),
                    })
                );

                const t = data.tunnel || data.data || data;
                success('Tunnel created!');
                if (t.url) info(`Public URL: ${t.url}`);
                if (t.expiresAt) info(`Expires:    ${formatDate(t.expiresAt)}`);
            } catch (err) {
                error(err.message);
            }
        });

    // ── tunnel revoke <id> ──
    tunnel
        .command('revoke <id>')
        .description('Revoke an active tunnel')
        .action(async (id) => {
            try {
                requireAuth();
                await withSpinner('Revoking tunnel...', () =>
                    apiDelete(`/tunnels/${id}`)
                );
                success('Tunnel revoked.');
            } catch (err) {
                error(err.message);
            }
        });
}
