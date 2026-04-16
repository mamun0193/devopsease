import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error,
    printTable, statusColor,
    handleJsonOutput, withSpinner, truncate,
} from '../utils/output.util.js';

export function registerNetworkCommands(program) {
    const network = program.command('network').description('Manage Docker networks');

    // network list 
    network
        .command('list')
        .description('List all networks')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching networks...', () =>
                    apiGet('/networks')
                );

                if (handleJsonOutput(opts, data)) return;

                const networks = data.networks || data.data || [];
                if (!networks.length) {
                    error('No networks found.');
                    return;
                }

                printTable(
                    ['ID', 'Name', 'Driver', 'Status', 'Containers'],
                    networks.map((n) => [
                        truncate(n._id || n.id, 12),
                        n.name || '—',
                        n.driver || 'bridge',
                        statusColor(n.usageStatus || n.status || 'active'),
                        String(n.containerCount ?? n.attachedContainers?.length ?? 0),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // network delete <id> 
    network
        .command('delete <id>')
        .description('Delete an unused network')
        .action(async (id) => {
            try {
                requireAuth();
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Delete network ${id}?`,
                        default: false,
                    },
                ]);
                if (!confirm) return;

                await withSpinner('Deleting network...', () =>
                    apiDelete(`/networks/${id}`)
                );
                success('Network deleted.');
            } catch (err) {
                error(err.message);
            }
        });
}
