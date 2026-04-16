import { Command } from 'commander';
import { apiGet } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    error, info, heading,
    printTable, handleJsonOutput, withSpinner, truncate,
} from '../utils/output.util.js';

export function registerImageCommands(program) {
    const image = program.command('image').description('Manage Docker images');

    // image list 
    image
        .command('list')
        .description('List all images')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching images...', () =>
                    apiGet('/images')
                );

                if (handleJsonOutput(opts, data)) return;

                const images = data.images || data.data || [];
                if (!images.length) {
                    error('No images found.');
                    return;
                }

                printTable(
                    ['ID', 'Repository', 'Tag', 'Size', 'Created'],
                    images.map((img) => {
                        const repo = img.repository || img.RepoTags?.[0]?.split(':')[0] || '—';
                        const tag = img.tag || img.RepoTags?.[0]?.split(':')[1] || 'latest';
                        const size = img.size || img.Size
                            ? `${((img.size || img.Size) / 1024 / 1024).toFixed(1)} MB`
                            : '—';
                        return [
                            truncate(img.id || img.Id, 12),
                            truncate(repo, 30),
                            tag,
                            size,
                            img.Created ? new Date(img.Created * 1000).toLocaleDateString() : '—',
                        ];
                    })
                );
            } catch (err) {
                error(err.message);
            }
        });

    // image usage 
    image
        .command('usage')
        .description('Show image usage summary')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching image usage...', () =>
                    apiGet('/images/usage-summary')
                );

                if (handleJsonOutput(opts, data)) return;

                const summary = data.data || data;
                heading('Image Usage Summary');
                info(`Total Images:  ${summary.totalImages ?? '—'}`);
                info(`Total Size:    ${summary.totalSizeMB ? summary.totalSizeMB.toFixed(1) + ' MB' : '—'}`);
                info(`In Use:        ${summary.inUse ?? '—'}`);
                info(`Unused:        ${summary.unused ?? '—'}`);
            } catch (err) {
                error(err.message);
            }
        });
}
