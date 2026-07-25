import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete, apiPut } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import { selectResource, confirmAction } from '../utils/interactive.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerEnvCommands(program) {
    const envCmd = program.command('env').description('Manage environment configuration');

    envCmd
        .command('list')
        .description('List config entries')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching config entries...', () => apiGet('/config/entries'));

                if (handleJsonOutput(opts, data)) return;

                const entries = data.entries || data.data || [];
                if (!entries.length) {
                    error('No config entries found.');
                    return;
                }

                printTable(
                    ['ID', 'Key', 'Type', 'Scope', 'Updated'],
                    entries.map((e) => [
                        truncate(e._id || e.id, 12),
                        e.key || '—',
                        e.type || 'string',
                        e.scope || 'global',
                        formatDate(e.updatedAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    envCmd
        .command('set')
        .description('Set a config entry')
        .action(async () => {
            try {
                requireAuth();
                const answers = await inquirer.prompt([
                    { type: 'input', name: 'key', message: 'Config Key (e.g., DATABASE_URL):' },
                    { type: 'input', name: 'value', message: 'Value:' },
                    { type: 'list', name: 'type', message: 'Type:', choices: ['string', 'secret', 'number', 'boolean'] },
                    { type: 'list', name: 'scope', message: 'Scope:', choices: ['global', 'environment', 'application'] }
                ]);

                await withSpinner('Setting config entry...', () => apiPost('/config/entries', answers));
                success('Config entry set successfully.');
            } catch (err) {
                error(err.message);
            }
        });

    envCmd
        .command('delete [id]')
        .description('Delete a config entry')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let entryId = id;
                if (!entryId) {
                    const data = await apiGet('/config/entries');
                    entryId = await selectResource(data.entries || data.data || [], e => e.key, { message: 'Select an entry to delete:' });
                }

                if (!opts.force) {
                    const confirmed = await confirmAction('Are you sure you want to delete this config entry?');
                    if (!confirmed) return;
                }

                await withSpinner('Deleting config entry...', () => apiDelete(`/config/entries/${entryId}`));
                success('Config entry deleted.');
            } catch (err) {
                error(err.message);
            }
        });

    envCmd
        .command('versions [id]')
        .description('View version history of an entry')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let entryId = id;
                if (!entryId) {
                    const data = await apiGet('/config/entries');
                    entryId = await selectResource(data.entries || data.data || [], e => e.key, { message: 'Select an entry:' });
                }

                const data = await withSpinner('Fetching history...', () => apiGet(`/config/entries/${entryId}/versions`));
                
                if (handleJsonOutput(opts, data)) return;
                
                const history = data.history || data.data || [];
                if (!history.length) {
                    info('No history available.');
                    return;
                }
                
                printTable(
                    ['Version', 'Value', 'Updated'],
                    history.map(h => [
                        h.version,
                        h.type === 'secret' ? '********' : truncate(h.value, 20),
                        formatDate(h.updatedAt)
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    envCmd
        .command('rollback [id]')
        .description('Rollback entry to previous version')
        .action(async (id) => {
            try {
                requireAuth();
                let entryId = id;
                if (!entryId) {
                    const data = await apiGet('/config/entries');
                    entryId = await selectResource(data.entries || data.data || [], e => e.key, { message: 'Select an entry to rollback:' });
                }

                const confirmed = await confirmAction('Rollback config entry to the previous version?');
                if (!confirmed) return;

                await withSpinner('Rolling back...', () => apiPost(`/config/entries/${entryId}/rollback`));
                success('Config entry rolled back successfully.');
            } catch (err) {
                error(err.message);
            }
        });
}
