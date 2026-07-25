import { Command } from 'commander';
import { apiGet, apiPost } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import { selectResource, confirmAction } from '../utils/interactive.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerReleaseCommands(program) {
    const releaseCmd = program.command('release').description('Manage releases and promotions');

    releaseCmd
        .command('list')
        .description('List all releases')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching releases...', () => apiGet('/releases'));

                if (handleJsonOutput(opts, data)) return;

                const releases = data.releases || data.data || [];
                if (!releases.length) {
                    error('No releases found.');
                    return;
                }

                printTable(
                    ['ID', 'Version', 'App ID', 'Environment', 'Status', 'Created'],
                    releases.map((r) => [
                        truncate(r._id || r.id, 12),
                        r.version || '—',
                        truncate(r.applicationId, 12) || '—',
                        r.environment || '—',
                        statusColor(r.status || 'unknown'),
                        formatDate(r.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    releaseCmd
        .command('get [id]')
        .description('Get release details')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let releaseId = id;
                if (!releaseId) {
                    const data = await apiGet('/releases');
                    releaseId = await selectResource(data.releases || data.data || [], r => `${r.version} (${r.environment})`, { message: 'Select a release:' });
                }

                const data = await withSpinner('Fetching release...', () => apiGet(`/releases/${releaseId}`));

                if (handleJsonOutput(opts, data)) return;

                const r = data.release || data.data || data;
                heading(`Release: ${r.version}`);
                info(`ID:          ${r._id || r.id}`);
                info(`App ID:      ${r.applicationId || '—'}`);
                info(`Environment: ${r.environment}`);
                info(`Status:      ${statusColor(r.status || 'unknown')}`);
                info(`Created:     ${formatDate(r.createdAt)}`);
            } catch (err) {
                error(err.message);
            }
        });

    releaseCmd
        .command('promote [id]')
        .description('Promote a release to the next environment')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let releaseId = id;
                if (!releaseId) {
                    const data = await apiGet('/releases');
                    releaseId = await selectResource(data.releases || data.data || [], r => `${r.version} (${r.environment})`, { message: 'Select a release to promote:' });
                }

                if (!opts.force) {
                    const confirmed = await confirmAction('Are you sure you want to promote this release?');
                    if (!confirmed) return;
                }

                await withSpinner('Promoting release...', () => apiPost(`/releases/${releaseId}/promote`));
                success('Release promoted successfully.');
            } catch (err) {
                error(err.message);
            }
        });

    releaseCmd
        .command('rollback [id]')
        .description('Rollback a release')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let releaseId = id;
                if (!releaseId) {
                    const data = await apiGet('/releases');
                    releaseId = await selectResource(data.releases || data.data || [], r => `${r.version} (${r.environment})`, { message: 'Select a release to rollback:' });
                }

                if (!opts.force) {
                    const confirmed = await confirmAction('Are you sure you want to rollback this release?');
                    if (!confirmed) return;
                }

                await withSpinner('Rolling back release...', () => apiPost(`/releases/${releaseId}/rollback`));
                success('Release rolled back successfully.');
            } catch (err) {
                error(err.message);
            }
        });
}
