import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerRepoCommands(program) {
    const repo = program.command('repo').description('Manage repositories');

    // repo list 
    repo
        .command('list')
        .description('List connected repositories')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching repositories...', () =>
                    apiGet('/api/repos')
                );

                if (handleJsonOutput(opts, data)) return;

                const repos = data.repositories || [];
                if (!repos.length) {
                    error('No repositories found. Connect one with `devopsease repo connect`.');
                    return;
                }

                printTable(
                    ['ID', 'Name', 'Owner', 'Provider', 'Branch', 'Connected'],
                    repos.map((r) => [
                        truncate(r._id, 12),
                        r.repoName,
                        r.owner,
                        r.provider || 'github',
                        r.defaultBranch || 'main',
                        formatDate(r.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // repo connect 
    repo
        .command('connect')
        .description('Connect a new repository')
        .action(async () => {
            try {
                requireAuth();
                const answers = await inquirer.prompt([
                    { type: 'input', name: 'repoName', message: 'Repository name:', validate: (v) => !!v || 'Required' },
                    { type: 'input', name: 'owner', message: 'Owner (org/user):', validate: (v) => !!v || 'Required' },
                    { type: 'input', name: 'cloneUrl', message: 'Clone URL:', validate: (v) => !!v || 'Required' },
                    { type: 'input', name: 'defaultBranch', message: 'Default branch:', default: 'main' },
                    {
                        type: 'list',
                        name: 'provider',
                        message: 'Git provider:',
                        choices: ['github', 'gitlab', 'bitbucket'],
                        default: 'github',
                    },
                ]);

                const data = await withSpinner('Connecting repository...', () =>
                    apiPost('/api/repos/connect', answers)
                );

                success(`Repository "${answers.repoName}" connected successfully.`);
            } catch (err) {
                error(err.message);
            }
        });

    // repo remove 
    repo
        .command('remove <id>')
        .description('Remove a connected repository')
        .action(async (id) => {
            try {
                requireAuth();
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Remove repository ${id}? This cannot be undone.`,
                        default: false,
                    },
                ]);

                if (!confirm) return;

                await withSpinner('Removing repository...', () =>
                    apiDelete(`/api/repos/${id}`)
                );

                success('Repository removed successfully.');
            } catch (err) {
                error(err.message);
            }
        });
}
