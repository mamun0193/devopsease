import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth, requireCluster, getNamespace, saveConfig } from '../utils/config.util.js';
import {
    success, error, info, printTable, statusColor,
    handleJsonOutput, withSpinner,
} from '../utils/output.util.js';

export function registerNamespaceCommands(program) {
    const ns = program.command('ns').alias('namespace').description('Manage Kubernetes namespaces');

    // ns list 
    ns
        .command('list')
        .description('List namespaces in the current cluster')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();

                const data = await withSpinner('Fetching namespaces...', () =>
                    apiGet(`/api/clusters/${clusterId}/namespaces`)
                );

                if (handleJsonOutput(opts, data)) return;

                const namespaces = data.namespaces || [];
                if (!namespaces.length) {
                    error('No namespaces found.');
                    return;
                }

                const currentNs = getNamespace();
                printTable(
                    ['', 'Name', 'Status'],
                    namespaces.map((n) => {
                        const name = typeof n === 'string' ? n : n.name || n.metadata?.name || String(n);
                        const status = typeof n === 'object' ? (n.status?.phase || n.status || 'Active') : 'Active';
                        return [
                            name === currentNs ? '→' : ' ',
                            name,
                            statusColor(status),
                        ];
                    })
                );
            } catch (err) {
                error(err.message);
            }
        });

    // ns create <name> 
    ns
        .command('create <name>')
        .description('Create a new namespace')
        .action(async (name) => {
            try {
                requireAuth();
                const clusterId = requireCluster();

                await withSpinner(`Creating namespace "${name}"...`, () =>
                    apiPost(`/api/clusters/${clusterId}/namespaces`, { name })
                );

                success(`Namespace "${name}" created.`);
            } catch (err) {
                error(err.message);
            }
        });

    // ns delete <name> 
    ns
        .command('delete <name>')
        .description('Delete a namespace')
        .action(async (name) => {
            try {
                requireAuth();
                const clusterId = requireCluster();

                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Delete namespace "${name}"? All resources inside will be destroyed.`,
                        default: false,
                    },
                ]);

                if (!confirm) return;

                await withSpinner(`Deleting namespace "${name}"...`, () =>
                    apiDelete(`/api/clusters/${clusterId}/namespaces/${name}`)
                );

                success(`Namespace "${name}" deleted.`);
            } catch (err) {
                error(err.message);
            }
        });

    // ns use <name> 
    ns
        .command('use <name>')
        .description('Set active namespace for subsequent commands')
        .action(async (name) => {
            try {
                saveConfig({ currentNamespace: name });
                success(`Active namespace set to "${name}"`);
                info('All commands will now use this namespace by default.');
            } catch (err) {
                error(err.message);
            }
        });
}
