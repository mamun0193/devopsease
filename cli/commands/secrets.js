import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, printTable,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';
import chalk from 'chalk';

export function registerSecretCommands(program) {
    const secrets = program.command('secrets').description('Manage secrets');

    // secrets list 
    secrets
        .command('list')
        .description('List all secrets')
        .option('-e, --environment <env>', 'Filter by environment')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const params = {};
                if (opts.environment) params.environment = opts.environment;

                const data = await withSpinner('Fetching secrets...', () =>
                    apiGet('/api/secrets', params)
                );

                if (handleJsonOutput(opts, data)) return;

                const secretsList = data.secrets || [];
                if (!secretsList.length) {
                    error('No secrets found. Create one with `devopsease secrets create`.');
                    return;
                }

                printTable(
                    ['ID', 'Name', 'Environment', 'Created'],
                    secretsList.map((s) => [
                        truncate(s._id, 12),
                        s.name,
                        s.environment || '—',
                        formatDate(s.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // secrets create 
    secrets
        .command('create')
        .description('Create a new secret')
        .action(async () => {
            try {
                requireAuth();
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'name',
                        message: 'Secret name (e.g., DATABASE_URL):',
                        validate: (v) => !!v || 'Required',
                    },
                    {
                        type: 'password',
                        name: 'value',
                        message: 'Secret value:',
                        mask: '*',
                        validate: (v) => v != null || 'Required',
                    },
                    {
                        type: 'list',
                        name: 'environment',
                        message: 'Environment:',
                        choices: ['development', 'staging', 'production'],
                        default: 'development',
                    },
                ]);

                await withSpinner('Creating secret...', () =>
                    apiPost('/api/secrets', answers)
                );

                success(`Secret "${answers.name}" created for ${answers.environment}.`);
            } catch (err) {
                error(err.message);
            }
        });

    // secrets delete <id> 
    secrets
        .command('delete <id>')
        .description('Delete a secret')
        .action(async (id) => {
            try {
                requireAuth();
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Delete secret ${id}? This cannot be undone.`,
                        default: false,
                    },
                ]);

                if (!confirm) return;

                await withSpinner('Deleting secret...', () =>
                    apiDelete(`/api/secrets/${id}`)
                );

                success('Secret deleted successfully.');
            } catch (err) {
                error(err.message);
            }
        });
}
