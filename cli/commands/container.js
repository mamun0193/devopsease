import { Command } from 'commander';
import inquirer from 'inquirer';
import { apiGet, apiPost, apiDelete } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import {
    success, error, info, warn, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerContainerCommands(program) {
    const container = program.command('container').alias('ct').description('Manage Docker containers');

    // container list 
    container
        .command('list')
        .description('List all containers')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching containers...', () =>
                    apiGet('/containers')
                );

                if (handleJsonOutput(opts, data)) return;

                const containers = data.data || [];
                if (!containers.length) {
                    error('No containers found. Create one with `devopsease container create`.');
                    return;
                }

                printTable(
                    ['ID', 'Name', 'Image', 'State', 'Ports', 'Created'],
                    containers.map((c) => [
                        truncate(c.id, 12),
                        c.name || '—',
                        truncate(c.image, 30),
                        statusColor(c.state),
                        (c.ports || []).map((p) =>
                            p.PublicPort ? `${p.PublicPort}→${p.PrivatePort}` : String(p.PrivatePort)
                        ).join(', ') || '—',
                        formatDate(c.created),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // container create 
    container
        .command('create')
        .description('Create a new container')
        .action(async () => {
            try {
                requireAuth();
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'image',
                        message: 'Docker image:',
                        validate: (v) => !!v || 'Image name is required',
                    },
                    {
                        type: 'input',
                        name: 'name',
                        message: 'Container name (optional):',
                    },
                    {
                        type: 'input',
                        name: 'ports',
                        message: 'Port mappings (e.g. 8080:80,3000:3000):',
                    },
                    {
                        type: 'input',
                        name: 'env',
                        message: 'Environment variables (e.g. KEY=val,FOO=bar):',
                    },
                    {
                        type: 'confirm',
                        name: 'autoStart',
                        message: 'Auto-start after creation?',
                        default: true,
                    },
                ]);

                // Parse ports
                let ports;
                if (answers.ports) {
                    ports = answers.ports.split(',').map((p) => {
                        const [host, container] = p.trim().split(':');
                        return { hostPort: host, containerPort: container || host };
                    });
                }

                // Parse env
                let env;
                if (answers.env) {
                    env = answers.env.split(',').map((e) => e.trim());
                }

                const body = {
                    image: answers.image,
                    name: answers.name || undefined,
                    ports,
                    env,
                    autoStart: answers.autoStart,
                };

                const data = await withSpinner('Creating container...', () =>
                    apiPost('/containers', body)
                );

                success(`Container created: ${data.data?.id || 'OK'}`);
            } catch (err) {
                error(err.message);
            }
        });

    // container start <id> 
    container
        .command('start <id>')
        .description('Start a container')
        .action(async (id) => {
            try {
                requireAuth();
                await withSpinner('Starting container...', () =>
                    apiPost(`/containers/${id}/start`)
                );
                success('Container started.');
            } catch (err) {
                error(err.message);
            }
        });

    // container stop <id> 
    container
        .command('stop <id>')
        .description('Stop a container')
        .action(async (id) => {
            try {
                requireAuth();
                await withSpinner('Stopping container...', () =>
                    apiPost(`/containers/${id}/stop`)
                );
                success('Container stopped.');
            } catch (err) {
                error(err.message);
            }
        });

    // container restart <id> 
    container
        .command('restart <id>')
        .description('Restart a container')
        .action(async (id) => {
            try {
                requireAuth();
                await withSpinner('Restarting container...', () =>
                    apiPost(`/containers/${id}/restart`)
                );
                success('Container restarted.');
            } catch (err) {
                error(err.message);
            }
        });

    // container remove <id> 
    container
        .command('remove <id>')
        .description('Remove a container')
        .option('-f, --force', 'Force remove even if running')
        .action(async (id, opts) => {
            try {
                requireAuth();
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Remove container ${truncate(id, 12)}? This cannot be undone.`,
                        default: false,
                    },
                ]);
                if (!confirm) return;

                const url = opts.force ? `/containers/${id}?force=true` : `/containers/${id}`;
                await withSpinner('Removing container...', () =>
                    apiDelete(url)
                );
                success('Container removed.');
            } catch (err) {
                error(err.message);
            }
        });

    // container logs <id> 
    container
        .command('logs <id>')
        .description('View container logs')
        .option('-t, --tail <lines>', 'Number of lines', '200')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching logs...', () =>
                    apiGet(`/containers/${id}/logs`, { tail: opts.tail })
                );

                if (handleJsonOutput(opts, data)) return;

                const logs = data.data?.parsed || data.data?.raw || [];
                if (!logs.length) {
                    info('No logs available.');
                    return;
                }

                for (const line of (Array.isArray(logs) ? logs : [logs])) {
                    if (typeof line === 'object') {
                        console.log(`${line.timestamp || ''} ${line.message || JSON.stringify(line)}`);
                    } else {
                        console.log(line);
                    }
                }
            } catch (err) {
                error(err.message);
            }
        });

    // container inspect <id> 
    container
        .command('inspect <id>')
        .description('Inspect a container')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Inspecting container...', () =>
                    apiGet(`/containers/${id}/inspect`)
                );

                if (handleJsonOutput(opts, data)) return;

                const d = data.data || {};
                heading(`Container: ${d.Name || id}`);
                info(`ID:       ${d.Id || id}`);
                info(`Image:    ${d.Config?.Image || d.Image || '—'}`);
                info(`State:    ${statusColor(d.State?.Status || 'unknown')}`);
                info(`Created:  ${formatDate(d.Created)}`);
                info(`Platform: ${d.Platform || '—'}`);

                if (d.NetworkSettings?.Ports) {
                    heading('Ports');
                    for (const [port, bindings] of Object.entries(d.NetworkSettings.Ports)) {
                        const bound = (bindings || []).map((b) => `${b.HostPort}`).join(', ');
                        info(`  ${port} → ${bound || '(not exposed)'}`);
                    }
                }
            } catch (err) {
                error(err.message);
            }
        });

    // container stats <id> 
    container
        .command('stats <id>')
        .description('View container resource usage')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching stats...', () =>
                    apiGet(`/containers/${id}/stats`)
                );

                if (handleJsonOutput(opts, data)) return;

                const s = data.data || {};
                heading(`Stats: ${id}`);
                info(`CPU:      ${s.cpuPercent?.toFixed(2) || 0}%`);
                info(`Memory:   ${s.memoryUsedMB?.toFixed(1) || 0} MB / ${s.memoryLimitMB?.toFixed(1) || 0} MB`);
                info(`Net I/O:  ${s.networkRx || 0} / ${s.networkTx || 0}`);
                info(`Block IO: ${s.blockRead || 0} / ${s.blockWrite || 0}`);
            } catch (err) {
                error(err.message);
            }
        });

    container
        .command('health [id]')
        .description('Check container health')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let containerId = id;
                if (!containerId) {
                    const { selectResource } = await import('../utils/interactive.util.js');
                    const data = await apiGet('/containers');
                    containerId = await selectResource(data.containers || [], c => `${c.Names?.[0] || c.Id} (${c.State})`, { message: 'Select a container:' });
                }

                const data = await withSpinner('Fetching health...', () => apiGet(`/containers/${containerId}/health`));

                if (handleJsonOutput(opts, data)) return;
                
                const h = data.health || data.data || data;
                heading(`Container Health: ${containerId}`);
                info(`Status: ${statusColor(h.Status || 'unknown')}`);
                if (h.FailingStreak) info(`Failing Streak: ${h.FailingStreak}`);
                if (h.Log) {
                    console.log('\nRecent Health Checks:');
                    h.Log.forEach((log) => {
                        console.log(`  [${formatDate(log.Start)}] ${log.Output.trim()}`);
                    });
                }
            } catch (err) {
                error(err.message);
            }
        });

    container
        .command('pause [id]')
        .description('Pause a running container')
        .action(async (id) => {
            try {
                requireAuth();
                let containerId = id;
                if (!containerId) {
                    const { selectResource } = await import('../utils/interactive.util.js');
                    const data = await apiGet('/containers');
                    containerId = await selectResource(data.containers || [], c => `${c.Names?.[0] || c.Id} (${c.State})`, { message: 'Select a container to pause:' });
                }

                await withSpinner('Pausing container...', () => apiPost(`/actions/container`, { action: 'pause', id: containerId }));
                success('Container paused.');
            } catch (err) {
                error(err.message);
            }
        });

    container
        .command('top [id]')
        .description('Display running processes of a container')
        .option('--json', 'Output raw JSON')
        .action(async (id, opts) => {
            try {
                requireAuth();
                let containerId = id;
                if (!containerId) {
                    const { selectResource } = await import('../utils/interactive.util.js');
                    const data = await apiGet('/containers');
                    containerId = await selectResource(data.containers || [], c => `${c.Names?.[0] || c.Id} (${c.State})`, { message: 'Select a container:' });
                }

                const data = await withSpinner('Fetching processes...', () => apiGet(`/containers/${containerId}/top`));

                if (handleJsonOutput(opts, data)) return;

                const top = data.top || data.data || data;
                if (!top.Titles || !top.Processes) {
                    info('No process information available.');
                    return;
                }

                printTable(top.Titles, top.Processes);
            } catch (err) {
                error(err.message);
            }
        });
}
