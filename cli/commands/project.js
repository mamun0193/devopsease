import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth, saveConfig } from '../utils/config.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerProjectCommands(program) {
    const project = program.command('project').description('Manage Compose projects');

    // project list 
    project
        .command('list')
        .description('List all projects')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching projects...', () =>
                    apiGet('/projects')
                );

                if (handleJsonOutput(opts, data)) return;

                const projects = data.projects || [];
                if (!projects.length) {
                    error('No projects found.');
                    return;
                }

                printTable(
                    ['ID', 'Name', 'Status', 'Containers', 'Created'],
                    projects.map((p) => [
                        truncate(p._id, 12),
                        p.name || '—',
                        statusColor(p.status),
                        String(p.containerCount ?? p.containers?.length ?? 0),
                        formatDate(p.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // project get <id> 
    project
        .command('get <id>')
        .description('Get project details')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching project...', () =>
                    apiGet(`/projects/${id}`)
                );

                if (handleJsonOutput(opts, data)) return;

                const p = data.project || data;
                heading(`Project: ${p.name || id}`);
                info(`ID:         ${p._id || id}`);
                info(`Status:     ${statusColor(p.status)}`);
                info(`Created:    ${formatDate(p.createdAt)}`);

                if (p.services && p.services.length) {
                    heading('Services');
                    printTable(
                        ['Name', 'Image', 'Status'],
                        p.services.map((s) => [
                            s.name || '—',
                            s.image || '—',
                            statusColor(s.status || 'unknown'),
                        ])
                    );
                }
            } catch (err) {
                error(err.message);
            }
        });

    // project start <id> 
    project
        .command('start <id>')
        .description('Start a project')
        .action(async (id) => {
            try {
                requireAuth();
                await withSpinner('Starting project...', () =>
                    apiPost(`/projects/${id}/start`)
                );
                success('Project started.');
            } catch (err) {
                error(err.message);
            }
        });

    // project stop <id> 
    project
        .command('stop <id>')
        .description('Stop a project')
        .action(async (id) => {
            try {
                requireAuth();
                await withSpinner('Stopping project...', () =>
                    apiPost(`/projects/${id}/stop`)
                );
                success('Project stopped.');
            } catch (err) {
                error(err.message);
            }
        });

    // project delete <id> 
    project
        .command('delete <id>')
        .description('Delete a project')
        .action(async (id) => {
            try {
                requireAuth();
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Delete project ${id}? All associated containers will be removed.`,
                        default: false,
                    },
                ]);
                if (!confirm) return;

                await withSpinner('Deleting project...', () =>
                    apiDelete(`/projects/${id}`)
                );
                success('Project deleted.');
            } catch (err) {
                error(err.message);
            }
        });

    // project use <id> 
    project
        .command('use <id>')
        .description('Set current project context')
        .action(async (id) => {
            try {
                saveConfig({ currentProject: id });
                success(`Active project set to ${id}`);
            } catch (err) {
                error(err.message);
            }
        });
}
