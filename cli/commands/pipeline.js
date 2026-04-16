import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerPipelineCommands(program) {
    const pipeline = program.command('pipeline').description('Manage CI/CD pipelines');

    // pipeline list 
    pipeline
        .command('list')
        .description('List all pipelines')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching pipelines...', () =>
                    apiGet('/api/pipelines')
                );

                if (handleJsonOutput(opts, data)) return;

                const pipelines = data.pipelines || [];
                if (!pipelines.length) {
                    error('No pipelines found. Create one with `devopsease pipeline create`.');
                    return;
                }

                printTable(
                    ['ID', 'Name', 'Steps', 'Version', 'Status', 'Created'],
                    pipelines.map((p) => [
                        truncate(p.id, 12),
                        p.name,
                        (p.steps || []).join(' → '),
                        `v${p.version}`,
                        statusColor(p.status),
                        formatDate(p.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // pipeline create 
    pipeline
        .command('create')
        .description('Create a new pipeline from YAML')
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
                        message: 'Select repository:',
                        choices: repos.map((r) => ({
                            name: `${r.owner}/${r.repoName}`,
                            value: r._id,
                        })),
                    },
                    {
                        type: 'input',
                        name: 'name',
                        message: 'Pipeline name (optional):',
                    },
                    {
                        type: 'checkbox',
                        name: 'steps',
                        message: 'Select pipeline steps:',
                        choices: [
                            { name: 'build', checked: true },
                            { name: 'test', checked: true },
                            { name: 'deploy', checked: true },
                        ],
                        validate: (v) => v.length > 0 || 'Select at least one step',
                    },
                ]);

                // Build YAML from selections
                const yamlString = `steps:\n${answers.steps.map((s) => `  - ${s}`).join('\n')}`;

                const data = await withSpinner('Creating pipeline...', () =>
                    apiPost('/api/pipelines', {
                        repoId: answers.repoId,
                        yaml: yamlString,
                        name: answers.name || undefined,
                    })
                );

                success(`Pipeline "${data.name}" created (v${data.version}).`);
            } catch (err) {
                error(err.message);
            }
        });

    // pipeline run <id> 
    pipeline
        .command('run <id>')
        .description('Trigger pipeline execution')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Running pipeline...', () =>
                    apiPost(`/api/pipelines/${id}/run`)
                );

                if (handleJsonOutput(opts, data)) return;

                success(`Pipeline "${data.name}" execution started.`);
                if (data.status) {
                    console.log(`  Status: ${statusColor(data.status)}`);
                }
                if (data.logs && data.logs.length) {
                    console.log(`  Logs:`);
                    data.logs.forEach((l) => console.log(`    ${l}`));
                }
            } catch (err) {
                error(err.message);
            }
        });

    // pipeline status <id> 
    pipeline
        .command('status <id>')
        .description('Check pipeline execution status')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching status...', () =>
                    apiGet(`/api/pipelines/${id}/status`)
                );

                if (handleJsonOutput(opts, data)) return;

                console.log(`  Pipeline: ${data.name || id}`);
                console.log(`  Status:   ${statusColor(data.executionStatus || data.status)}`);
                if (data.startedAt) console.log(`  Started:  ${formatDate(data.startedAt)}`);
                if (data.completedAt) console.log(`  Finished: ${formatDate(data.completedAt)}`);
                if (data.executionLogs && data.executionLogs.length) {
                    console.log(`  Logs:`);
                    data.executionLogs.forEach((l) => console.log(`    ${l}`));
                }
            } catch (err) {
                error(err.message);
            }
        });
}
