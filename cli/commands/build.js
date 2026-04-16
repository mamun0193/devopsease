import { Command } from 'commander';
import { apiGet, apiPost } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerBuildCommands(program) {
    const build = program.command('build').description('Manage builds');

    // build list 
    build
        .command('list')
        .description('List all builds')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching builds...', () =>
                    apiGet('/builds')
                );

                if (handleJsonOutput(opts, data)) return;

                const builds = data.builds || [];
                if (!builds.length) {
                    error('No builds found.');
                    return;
                }

                printTable(
                    ['ID', 'Status', 'Tag', 'Commit', 'Created'],
                    builds.map((b) => [
                        truncate(b._id, 12),
                        statusColor(b.status),
                        b.tag || '—',
                        truncate(b.commitHash, 8) || '—',
                        formatDate(b.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // build get <id> 
    build
        .command('get <id>')
        .description('Get build details')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching build...', () =>
                    apiGet(`/builds/${id}`)
                );

                if (handleJsonOutput(opts, data)) return;

                const b = data.build || data;
                heading(`Build: ${id}`);
                info(`Status:  ${statusColor(b.status)}`);
                info(`Tag:     ${b.tag || '—'}`);
                info(`Commit:  ${b.commitHash || '—'}`);
                info(`Created: ${formatDate(b.createdAt)}`);

                if (b.logs && b.logs.length) {
                    heading('Build Logs');
                    for (const line of b.logs) {
                        console.log(line);
                    }
                }
            } catch (err) {
                error(err.message);
            }
        });

    // build images 
    build
        .command('images')
        .description('List built images')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching build images...', () =>
                    apiGet('/builds/images')
                );

                if (handleJsonOutput(opts, data)) return;

                const images = data.images || [];
                if (!images.length) {
                    error('No build images found.');
                    return;
                }

                printTable(
                    ['ID', 'Tag', 'Size', 'Created'],
                    images.map((img) => [
                        truncate(img._id || img.id, 12),
                        img.tag || img.name || '—',
                        img.size ? `${(img.size / 1024 / 1024).toFixed(1)} MB` : '—',
                        formatDate(img.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });
}
