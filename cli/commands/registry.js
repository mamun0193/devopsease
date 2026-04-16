import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, truncate,
} from '../utils/output.util.js';

export function registerRegistryCommands(program) {
    const registry = program.command('registry').description('Manage Docker Hub / registry');

    // registry status 
    registry
        .command('status')
        .description('Check Docker Hub connection status')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Checking registry status...', () =>
                    apiGet('/dockerhub/status')
                );

                if (handleJsonOutput(opts, data)) return;

                const s = data.data || data;
                heading('Docker Hub Registry');
                info(`Connected: ${s.connected ? statusColor('connected') : statusColor('inactive')}`);
                if (s.username) info(`Username:  ${s.username}`);
                if (s.email) info(`Email:     ${s.email}`);
            } catch (err) {
                error(err.message);
            }
        });

    // registry connect 
    registry
        .command('connect')
        .description('Connect to Docker Hub')
        .action(async () => {
            try {
                requireAuth();
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'username',
                        message: 'Docker Hub username:',
                        validate: (v) => !!v || 'Required',
                    },
                    {
                        type: 'password',
                        name: 'password',
                        message: 'Docker Hub password/token:',
                        mask: '*',
                        validate: (v) => !!v || 'Required',
                    },
                ]);

                await withSpinner('Connecting to Docker Hub...', () =>
                    apiPost('/dockerhub/connect', answers)
                );
                success('Docker Hub connected.');
            } catch (err) {
                error(err.message);
            }
        });

    // registry disconnect 
    registry
        .command('disconnect')
        .description('Disconnect from Docker Hub')
        .action(async () => {
            try {
                requireAuth();
                await withSpinner('Disconnecting...', () =>
                    apiDelete('/dockerhub/disconnect')
                );
                success('Docker Hub disconnected.');
            } catch (err) {
                error(err.message);
            }
        });

    // registry search <query> 
    registry
        .command('search <query>')
        .description('Search Docker Hub images')
        .option('--json', 'Output raw JSON')
        .action(async (query, opts) => {
            try {
                requireAuth();
                const data = await withSpinner(`Searching "${query}"...`, () =>
                    apiGet('/dockerhub/search', { q: query })
                );

                if (handleJsonOutput(opts, data)) return;

                const results = data.results || data.data || [];
                if (!results.length) {
                    error(`No images found for "${query}".`);
                    return;
                }

                printTable(
                    ['Name', 'Description', 'Stars', 'Official'],
                    results.slice(0, 15).map((r) => [
                        r.name || '—',
                        truncate(r.description || '', 40),
                        String(r.star_count || r.stars || 0),
                        r.is_official ? '✔' : '',
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // registry pull <image> 
    registry
        .command('pull <image>')
        .description('Pull an image from Docker Hub')
        .action(async (image) => {
            try {
                requireAuth();
                await withSpinner(`Pulling ${image}...`, () =>
                    apiPost('/dockerhub/pull', { image })
                );
                success(`Image "${image}" pulled successfully.`);
            } catch (err) {
                error(err.message);
            }
        });

    // registry push <image> 
    registry
        .command('push <image>')
        .description('Push an image to Docker Hub')
        .action(async (image) => {
            try {
                requireAuth();
                await withSpinner(`Pushing ${image}...`, () =>
                    apiPost('/dockerhub/push', { image })
                );
                success(`Image "${image}" pushed successfully.`);
            } catch (err) {
                error(err.message);
            }
        });
}
