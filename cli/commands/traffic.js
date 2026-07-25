import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import { selectResource } from '../utils/interactive.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerTrafficCommands(program) {
    const trafficCmd = program.command('traffic').description('Manage traffic policies and routing');

    trafficCmd
        .command('policies')
        .description('List traffic policies')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching traffic policies...', () => apiGet('/traffic/policies'));

                if (handleJsonOutput(opts, data)) return;

                const policies = data.policies || data.data || [];
                if (!policies.length) {
                    error('No traffic policies found.');
                    return;
                }

                printTable(
                    ['ID', 'App ID', 'Type', 'Status', 'Updated'],
                    policies.map((p) => [
                        truncate(p._id || p.id, 12),
                        truncate(p.applicationId, 12) || '—',
                        p.type || 'unknown',
                        statusColor(p.status || 'active'),
                        formatDate(p.updatedAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    trafficCmd
        .command('apply')
        .description('Apply a traffic policy')
        .action(async () => {
            try {
                requireAuth();
                const appData = await apiGet('/applications');
                const apps = appData.applications || appData.data || [];
                
                if (!apps.length) {
                    error('No applications found.');
                    return;
                }

                const appId = await selectResource(apps, a => `${a.name} (${a.slug})`, { message: 'Select application:' });

                const answers = await inquirer.prompt([
                    { type: 'list', name: 'type', message: 'Policy Type:', choices: ['canary', 'blue-green', 'ab-testing'] },
                    { type: 'input', name: 'primaryWeight', message: 'Primary Weight (e.g., 90):', default: '90' }
                ]);

                const primaryWeight = parseInt(answers.primaryWeight, 10);
                if (isNaN(primaryWeight) || primaryWeight < 0 || primaryWeight > 100) {
                    throw new Error('Weight must be between 0 and 100');
                }
                const secondaryWeight = 100 - primaryWeight;

                const body = {
                    applicationId: appId,
                    type: answers.type,
                    rules: [
                        { target: 'primary', weight: primaryWeight },
                        { target: 'secondary', weight: secondaryWeight }
                    ]
                };

                await withSpinner('Applying traffic policy...', () => apiPost('/traffic/policies', body));
                success('Traffic policy applied successfully.');
            } catch (err) {
                error(err.message);
            }
        });

    trafficCmd
        .command('routes <slug>')
        .description('View routing table for an application')
        .option('--json', 'Output raw JSON')
        .action(async (slug, opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching routing table...', () => apiGet(`/traffic/routing-table/${slug}`));

                if (handleJsonOutput(opts, data)) return;

                const routes = data.routes || data.data || [];
                if (!routes.length) {
                    info('No routes found in the routing table.');
                    return;
                }

                heading(`Routing Table: ${slug}`);
                printTable(
                    ['Path', 'Target', 'Weight'],
                    routes.map((r) => [
                        r.path || '/',
                        r.target || '—',
                        r.weight ? `${r.weight}%` : '—'
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });
}
