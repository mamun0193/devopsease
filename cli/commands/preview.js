import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import { selectResource, confirmAction } from '../utils/interactive.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerPreviewCommands(program) {
    const previewCmd = program.command('preview').description('Manage preview environments');

    previewCmd
        .command('list')
        .description('List preview environments')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching previews...', () => apiGet('/previews'));

                if (handleJsonOutput(opts, data)) return;

                const previews = data.previews || data.data || [];
                if (!previews.length) {
                    error('No preview environments found.');
                    return;
                }

                printTable(
                    ['ID', 'Branch', 'Status', 'Expires', 'Created'],
                    previews.map((p) => [
                        truncate(p._id || p.id, 12),
                        p.branch || '—',
                        statusColor(p.status || 'unknown'),
                        formatDate(p.expiresAt),
                        formatDate(p.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    previewCmd
        .command('create')
        .description('Create a preview environment')
        .action(async () => {
            try {
                requireAuth();
                const repoData = await apiGet('/repos');
                const repos = repoData.repositories || repoData.data || [];
                
                if (!repos.length) {
                    error('No repositories found.');
                    return;
                }

                const repoId = await selectResource(repos, r => `${r.owner}/${r.repoName}`, { message: 'Select repository:' });
                
                const answers = await inquirer.prompt([
                    { type: 'input', name: 'branch', message: 'Branch name (e.g., feature/login):' },
                ]);

                const data = await withSpinner('Creating preview environment...', () => 
                    apiPost('/previews', { repositoryId: repoId, branch: answers.branch })
                );

                success('Preview environment created successfully.');
                info(`ID: ${data.data?._id || data._id || 'unknown'}`);
            } catch (err) {
                error(err.message);
            }
        });

    previewCmd
        .command('get [id]')
        .description('Get preview details')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let previewId = id;
                if (!previewId) {
                    const data = await apiGet('/previews');
                    previewId = await selectResource(data.previews || data.data || [], p => `${p.branch} (${truncate(p._id || p.id, 8)})`, { message: 'Select a preview:' });
                }

                const data = await withSpinner('Fetching preview...', () => apiGet(`/previews/${previewId}`));

                if (handleJsonOutput(opts, data)) return;

                const p = data.preview || data.data || data;
                heading(`Preview: ${p.branch}`);
                info(`ID:      ${p._id || p.id}`);
                info(`Status:  ${statusColor(p.status || 'unknown')}`);
                info(`Expires: ${formatDate(p.expiresAt)}`);
                info(`Created: ${formatDate(p.createdAt)}`);
            } catch (err) {
                error(err.message);
            }
        });

    previewCmd
        .command('destroy [id]')
        .description('Destroy a preview environment')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let previewId = id;
                if (!previewId) {
                    const data = await apiGet('/previews');
                    previewId = await selectResource(data.previews || data.data || [], p => `${p.branch} (${truncate(p._id || p.id, 8)})`, { message: 'Select a preview to destroy:' });
                }

                if (!opts.force) {
                    const confirmed = await confirmAction('Are you sure you want to destroy this preview environment?');
                    if (!confirmed) return;
                }

                await withSpinner('Destroying preview...', () => apiDelete(`/previews/${previewId}`));
                success('Preview environment destroyed.');
            } catch (err) {
                error(err.message);
            }
        });

    previewCmd
        .command('extend [id]')
        .description('Extend preview TTL')
        .action(async (id) => {
            try {
                requireAuth();
                let previewId = id;
                if (!previewId) {
                    const data = await apiGet('/previews');
                    previewId = await selectResource(data.previews || data.data || [], p => `${p.branch} (${truncate(p._id || p.id, 8)})`, { message: 'Select a preview to extend:' });
                }

                await withSpinner('Extending preview...', () => apiPost(`/previews/${previewId}/extend`));
                success('Preview environment extended.');
            } catch (err) {
                error(err.message);
            }
        });
}
