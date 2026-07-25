import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import { selectResource, confirmAction } from '../utils/interactive.util.js';
import {
    success, error, info, heading, dim,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerDomainCommands(program) {
    const domainCmd = program.command('domain').description('Manage custom domains');

    domainCmd
        .command('list')
        .description('List domains')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching domains...', () => apiGet('/domains'));

                if (handleJsonOutput(opts, data)) return;

                const domains = data.domains || data.data || [];
                if (!domains.length) {
                    error('No domains found.');
                    return;
                }

                printTable(
                    ['ID', 'Hostname', 'Status', 'App ID', 'Created'],
                    domains.map((d) => [
                        truncate(d._id || d.id, 12),
                        d.hostname || '—',
                        statusColor(d.status || 'unknown'),
                        truncate(d.applicationId || d.application, 12) || '—',
                        formatDate(d.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    domainCmd
        .command('add')
        .description('Add a new custom domain')
        .action(async () => {
            try {
                requireAuth();
                const appData = await apiGet('/applications');
                const apps = appData.applications || appData.data || [];

                const answers = await inquirer.prompt([
                    { type: 'input', name: 'hostname', message: 'Domain hostname (e.g., app.example.com):' },
                ]);
                
                let appId = null;
                if (apps.length > 0) {
                    const { linkApp } = await inquirer.prompt([
                        { type: 'confirm', name: 'linkApp', message: 'Link to an application now?', default: true }
                    ]);
                    if (linkApp) {
                        appId = await selectResource(apps, a => `${a.name} (${a.slug})`, { message: 'Select application:' });
                    }
                }

                const body = { hostname: answers.hostname };
                if (appId) body.applicationId = appId;

                const data = await withSpinner('Adding domain...', () => apiPost('/domains', body));

                success(`Domain added successfully: ${data.data?.hostname || data.hostname || answers.hostname}`);
                info('Run `devopsease domain verify` to evaluate DNS records.');
            } catch (err) {
                error(err.message);
            }
        });

    domainCmd
        .command('get [id]')
        .description('Get domain details')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let domainId = id;
                if (!domainId) {
                    const data = await apiGet('/domains');
                    domainId = await selectResource(data.domains || data.data || [], d => d.hostname, { message: 'Select a domain:' });
                }

                const data = await withSpinner('Fetching domain...', () => apiGet(`/domains/${domainId}`));

                if (handleJsonOutput(opts, data)) return;

                const d = data.domain || data.data || data;
                heading(`Domain: ${d.hostname}`);
                info(`ID:      ${d._id || d.id}`);
                info(`Status:  ${statusColor(d.status || 'unknown')}`);
                info(`App ID:  ${d.applicationId || d.application || 'None'}`);
                info(`Created: ${formatDate(d.createdAt)}`);
            } catch (err) {
                error(err.message);
            }
        });

    domainCmd
        .command('remove [id]')
        .description('Remove a custom domain')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let domainId = id;
                if (!domainId) {
                    const data = await apiGet('/domains');
                    domainId = await selectResource(data.domains || data.data || [], d => d.hostname, { message: 'Select a domain to remove:' });
                }

                if (!opts.force) {
                    const confirmed = await confirmAction('Are you sure you want to remove this domain?');
                    if (!confirmed) return;
                }

                await withSpinner('Removing domain...', () => apiDelete(`/domains/${domainId}`));
                success('Domain removed successfully.');
            } catch (err) {
                error(err.message);
            }
        });

    domainCmd
        .command('verify [id]')
        .description('Trigger DNS verification')
        .action(async (id) => {
            try {
                requireAuth();
                let domainId = id;
                if (!domainId) {
                    const data = await apiGet('/domains');
                    domainId = await selectResource(data.domains || data.data || [], d => d.hostname, { message: 'Select a domain to verify:' });
                }

                await withSpinner('Verifying domain...', () => apiPost(`/domains/${domainId}/verify`));
                success('Domain verification triggered.');
            } catch (err) {
                error(err.message);
            }
        });
}
