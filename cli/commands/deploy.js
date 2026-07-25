import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerDeployCommands(program) {
    const deploy = program.command('deploy').description('Manage deployments');

    // deploy list 
    deploy
        .command('list')
        .description('List all deployments')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching deployments...', () =>
                    apiGet('/api/deployments')
                );

                if (handleJsonOutput(opts, data)) return;

                const deployments = data.deployments || [];
                if (!deployments.length) {
                    error('No deployments found.');
                    return;
                }

                printTable(
                    ['ID', 'Status', 'Env', 'Image', 'Commit', 'Created'],
                    deployments.map((d) => [
                        truncate(d._id, 12),
                        statusColor(d.status),
                        d.environment || '—',
                        d.imageTag || '—',
                        truncate(d.build?.commitHash, 8) || '—',
                        formatDate(d.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // deploy trigger 
    deploy
        .command('trigger')
        .description('Trigger a new deployment (build + deploy)')
        .action(async () => {
            try {
                requireAuth();

                // Fetch repos for selection
                const repoData = await apiGet('/api/repos');
                const repos = repoData.repositories || [];
                if (!repos.length) {
                    error('No repositories found. Connect one first with `devopsease repo connect`.');
                    return;
                }

                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'repoId',
                        message: 'Select repository to deploy:',
                        choices: repos.map((r) => ({
                            name: `${r.owner}/${r.repoName}`,
                            value: r._id,
                        })),
                    },
                    {
                        type: 'list',
                        name: 'environment',
                        message: 'Environment:',
                        choices: ['development', 'staging', 'production'],
                        default: 'development',
                    },
                ]);

                const data = await withSpinner('Triggering deployment...', () =>
                    apiPost('/builds', { repoId: answers.repoId, environment: answers.environment })
                );

                success('Deployment triggered successfully.');
                if (data._id) console.log(`  Build ID: ${data._id}`);
            } catch (err) {
                error(err.message);
            }
        });

    // deploy rollback <id> 
    deploy
        .command('rollback <id>')
        .description('Rollback a deployment')
        .option('--reason <reason>', 'Reason for rollback')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();

                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Rollback deployment ${id}? This will revert to the previous version.`,
                        default: false,
                    },
                ]);

                if (!confirm) return;

                const body = {};
                if (opts.reason) body.reason = opts.reason;

                const data = await withSpinner('Rolling back deployment...', () =>
                    apiPost(`/api/deployments/${id}/rollback`, body)
                );

                if (handleJsonOutput(opts, data)) return;

                success('Deployment rolled back successfully.');
            } catch (err) {
                error(err.message);
            }
        });

    deploy
        .command('get [id]')
        .description('Get deployment details')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let deployId = id;
                if (!deployId) {
                    const { selectResource } = await import('../utils/interactive.util.js');
                    const data = await apiGet('/api/deployments');
                    deployId = await selectResource(data.deployments || [], d => `${d._id} (${d.environment})`, { message: 'Select a deployment:' });
                }

                const data = await withSpinner('Fetching deployment...', () => apiGet(`/api/deployments/${deployId}`));

                if (handleJsonOutput(opts, data)) return;

                const d = data.deployment || data.data || data;
                heading(`Deployment: ${d._id}`);
                info(`Environment: ${d.environment}`);
                info(`Status:      ${statusColor(d.status || 'unknown')}`);
                info(`Created:     ${formatDate(d.createdAt)}`);
            } catch (err) {
                error(err.message);
            }
        });

    deploy
        .command('logs [id]')
        .description('View deployment logs')
        .action(async (id) => {
            try {
                requireAuth();
                let deployId = id;
                if (!deployId) {
                    const { selectResource } = await import('../utils/interactive.util.js');
                    const data = await apiGet('/api/deployments');
                    deployId = await selectResource(data.deployments || [], d => `${d._id} (${d.environment})`, { message: 'Select a deployment to view logs:' });
                }

                const data = await withSpinner('Fetching logs...', () => apiGet(`/api/deployments/${deployId}/logs`));
                const logs = data.logs || data.data || [];
                if (!logs.length) {
                    info('No logs available.');
                    return;
                }
                logs.forEach(l => console.log(l));
            } catch (err) {
                error(err.message);
            }
        });

    deploy
        .command('scale [id]')
        .description('Scale a deployment')
        .requiredOption('-r, --replicas <count>', 'Number of replicas')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let deployId = id;
                if (!deployId) {
                    const { selectResource } = await import('../utils/interactive.util.js');
                    const data = await apiGet('/api/deployments');
                    deployId = await selectResource(data.deployments || [], d => `${d._id} (${d.environment})`, { message: 'Select a deployment to scale:' });
                }

                const replicas = parseInt(opts.replicas, 10);
                if (isNaN(replicas) || replicas < 0) throw new Error('Replicas must be a positive integer.');

                await withSpinner('Scaling deployment...', () => apiPost(`/api/deployments/${deployId}/scale`, { replicas }));
                success(`Deployment scaled to ${replicas} replicas.`);
            } catch (err) {
                error(err.message);
            }
        });
}
