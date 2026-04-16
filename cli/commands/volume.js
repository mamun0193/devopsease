import { Command } from 'commander';
import { apiGet, apiPost } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, truncate,
} from '../utils/output.util.js';

export function registerVolumeCommands(program) {
    const volume = program.command('volume').description('Manage Docker volumes');

    // ── volume list ──
    volume
        .command('list')
        .description('List all volumes')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching volumes...', () =>
                    apiGet('/volumes')
                );

                if (handleJsonOutput(opts, data)) return;

                const volumes = data.volumes || data.data || [];
                if (!volumes.length) {
                    error('No volumes found.');
                    return;
                }

                printTable(
                    ['Name', 'Driver', 'Status', 'Size'],
                    volumes.map((v) => [
                        truncate(v.name || v.Name, 30),
                        v.driver || v.Driver || 'local',
                        statusColor(v.usageStatus || v.status || 'active'),
                        v.size ? `${(v.size / 1024 / 1024).toFixed(1)} MB` : '—',
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // ── volume prune-preview ──
    volume
        .command('prune-preview')
        .description('Preview volumes that would be pruned')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Scanning unused volumes...', () =>
                    apiGet('/volumes/prune-preview')
                );

                if (handleJsonOutput(opts, data)) return;

                const preview = data.data || data;
                heading('Prune Preview');
                info(`Volumes to remove: ${preview.count ?? preview.volumes?.length ?? 0}`);
                info(`Space to reclaim:  ${preview.totalSizeMB ? preview.totalSizeMB.toFixed(1) + ' MB' : '—'}`);

                if (preview.volumes && preview.volumes.length) {
                    printTable(
                        ['Name', 'Size'],
                        preview.volumes.map((v) => [
                            truncate(v.name || v.Name, 30),
                            v.size ? `${(v.size / 1024 / 1024).toFixed(1)} MB` : '—',
                        ])
                    );
                }
            } catch (err) {
                error(err.message);
            }
        });

    // ── volume prune ──
    volume
        .command('prune')
        .description('Remove all unused volumes')
        .action(async () => {
            try {
                requireAuth();
                const inquirer = await import('inquirer');
                const { confirm } = await inquirer.default.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Prune all unused volumes? This cannot be undone.',
                        default: false,
                    },
                ]);
                if (!confirm) return;

                const data = await withSpinner('Pruning unused volumes...', () =>
                    apiPost('/volumes/prune-unused')
                );
                success(`Pruned ${data.data?.removed ?? 0} volume(s).`);
            } catch (err) {
                error(err.message);
            }
        });
}
