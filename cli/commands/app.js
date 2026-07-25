import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import { selectResource, confirmAction } from '../utils/interactive.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerAppCommands(program) {
    const appCmd = program.command('app').description('Manage applications');

    appCmd
        .command('list')
        .description('List applications')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching applications...', () =>
                    apiGet('/applications')
                );

                if (handleJsonOutput(opts, data)) return;

                const apps = data.applications || data.data || [];
                if (!apps.length) {
                    error('No applications found.');
                    return;
                }

                printTable(
                    ['ID', 'Name', 'Slug', 'Status', 'Created'],
                    apps.map((a) => [
                        truncate(a._id || a.id, 12),
                        a.name || '—',
                        a.slug || '—',
                        statusColor(a.status || 'unknown'),
                        formatDate(a.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    appCmd
        .command('create')
        .description('Create a new application')
        .action(async () => {
            try {
                requireAuth();
                
                const repoData = await apiGet('/repos');
                const repos = repoData.repositories || [];
                if (!repos.length) {
                    error('No repositories found. Connect one first with `devopsease repo connect`.');
                    return;
                }

                const answers = await inquirer.prompt([
                    { type: 'input', name: 'name', message: 'Application Name:' },
                    { type: 'input', name: 'slug', message: 'Application Slug (optional):' },
                    {
                        type: 'list',
                        name: 'repoId',
                        message: 'Select Repository:',
                        choices: repos.map(r => ({ name: `${r.owner}/${r.repoName}`, value: r._id }))
                    }
                ]);

                const body = { name: answers.name, repositoryId: answers.repoId };
                if (answers.slug) body.slug = answers.slug;

                const data = await withSpinner('Creating application...', () =>
                    apiPost('/applications', body)
                );

                success(`Application created successfully: ${data.data?.name || data.name || answers.name}`);
            } catch (err) {
                error(err.message);
            }
        });

    appCmd
        .command('get [id]')
        .description('Get application details')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let appId = id;
                if (!appId) {
                    const data = await apiGet('/applications');
                    appId = await selectResource(data.applications || data.data || [], (a) => `${a.name} (${a.slug})`, { message: 'Select an application:' });
                }

                const data = await withSpinner('Fetching application...', () =>
                    apiGet(`/applications/${appId}`)
                );

                if (handleJsonOutput(opts, data)) return;

                const app = data.application || data.data || data;
                heading(`Application: ${app.name}`);
                info(`ID:      ${app._id || app.id}`);
                info(`Slug:    ${app.slug}`);
                info(`Status:  ${statusColor(app.status || 'unknown')}`);
                info(`Created: ${formatDate(app.createdAt)}`);
            } catch (err) {
                error(err.message);
            }
        });

    appCmd
        .command('delete [id]')
        .description('Delete an application')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let appId = id;
                if (!appId) {
                    const data = await apiGet('/applications');
                    appId = await selectResource(data.applications || data.data || [], (a) => `${a.name} (${a.slug})`, { message: 'Select an application to delete:' });
                }

                if (!opts.force) {
                    const confirmed = await confirmAction('Are you sure you want to delete this application?');
                    if (!confirmed) return;
                }

                await withSpinner('Deleting application...', () =>
                    apiDelete(`/applications/${appId}`)
                );

                success('Application deleted successfully.');
            } catch (err) {
                error(err.message);
            }
        });
}
