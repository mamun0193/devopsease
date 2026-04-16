import { Command } from 'commander';
import chalk from 'chalk';
import { apiGet } from '../utils/api.util.js';
import { requireAuth, requireCluster, getNamespace } from '../utils/config.util.js';
import {
    success, error, info, dim, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate,
} from '../utils/output.util.js';

export function registerPodCommands(program) {
    // pod list  (also registered as `pods` alias below)
    const pod = program.command('pod').description('Manage Kubernetes pods');

    pod
        .command('list')
        .description('List pods in the current namespace')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();
                const namespace = opts.namespace || getNamespace();

                const data = await withSpinner(`Fetching pods in "${namespace}"...`, () =>
                    apiGet(`/api/clusters/${clusterId}/pods`, { namespace })
                );

                if (handleJsonOutput(opts, data)) return;

                const pods = data.pods || [];
                if (!pods.length) {
                    error(`No pods found in namespace "${namespace}".`);
                    return;
                }

                printTable(
                    ['Name', 'Status', 'Restarts', 'Age', 'IP', 'Node'],
                    pods.map((p) => {
                        const status = p.status?.phase || p.status || 'Unknown';
                        const restarts = p.status?.containerStatuses?.[0]?.restartCount
                            ?? p.restarts ?? 0;
                        const startTime = p.status?.startTime || p.metadata?.creationTimestamp || p.createdAt;
                        const name = p.metadata?.name || p.name || '—';
                        const ip = p.status?.podIP || p.podIP || '—';
                        const node = p.spec?.nodeName || p.nodeName || '—';

                        return [
                            name,
                            statusColor(status),
                            String(restarts),
                            formatDate(startTime),
                            ip,
                            node,
                        ];
                    })
                );
            } catch (err) {
                error(err.message);
            }
        });

    // pod logs <podName> 
    pod
        .command('logs <podName>')
        .description('View pod logs')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('-t, --tail <lines>', 'Number of lines to show', '100')
        .option('-f, --follow', 'Stream logs continuously (polls every 3s)')
        .option('-c, --container <container>', 'Container name (for multi-container pods)')
        .option('--json', 'Output raw JSON')
        .action(async (podName, opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();
                const namespace = opts.namespace || getNamespace();

                const params = {
                    namespace,
                    tailLines: parseInt(opts.tail, 10) || 100,
                };
                if (opts.container) params.container = opts.container;

                if (opts.follow) {
                    // Polling-based follow mode
                    info(`Streaming logs for ${podName} (Ctrl+C to stop)...`);
                    let lastLineCount = 0;

                    const poll = async () => {
                        try {
                            const data = await apiGet(
                                `/api/clusters/${clusterId}/pods/${podName}/logs`,
                                params
                            );
                            const logs = data.logs || [];
                            const newLines = logs.slice(lastLineCount);
                            for (const line of newLines) {
                                console.log(line);
                            }
                            lastLineCount = logs.length;
                        } catch (e) {
                            error(e.message);
                        }
                    };

                    await poll();
                    const interval = setInterval(poll, 3000);

                    process.on('SIGINT', () => {
                        clearInterval(interval);
                        dim('\nLog stream ended.');
                        process.exit(0);
                    });

                    // Keep process alive
                    await new Promise(() => {});
                } else {
                    const data = await withSpinner(`Fetching logs for ${podName}...`, () =>
                        apiGet(`/api/clusters/${clusterId}/pods/${podName}/logs`, params)
                    );

                    if (handleJsonOutput(opts, data)) return;

                    const logs = data.logs || [];
                    if (!logs.length) {
                        dim('No logs available.');
                        return;
                    }

                    for (const line of logs) {
                        console.log(line);
                    }
                }
            } catch (err) {
                error(err.message);
            }
        });

    // pod describe <podName> 
    pod
        .command('describe <podName>')
        .description('Show detailed info about a pod')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (podName, opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();
                const namespace = opts.namespace || getNamespace();

                const data = await withSpinner(`Describing pod ${podName}...`, () =>
                    apiGet(`/api/clusters/${clusterId}/pods`, { namespace })
                );

                if (handleJsonOutput(opts, data)) return;

                const pods = data.pods || [];
                const pod = pods.find(
                    (p) => (p.metadata?.name || p.name) === podName
                );

                if (!pod) {
                    error(`Pod "${podName}" not found in namespace "${namespace}".`);
                    return;
                }

                heading(`Pod: ${podName}`);
                const meta = pod.metadata || {};
                const spec = pod.spec || {};
                const status = pod.status || {};

                info(`Namespace:  ${meta.namespace || namespace}`);
                info(`Status:     ${statusColor(status.phase || 'Unknown')}`);
                info(`Node:       ${spec.nodeName || '—'}`);
                info(`IP:         ${status.podIP || '—'}`);
                info(`Started:    ${formatDate(status.startTime || meta.creationTimestamp)}`);

                const containers = spec.containers || [];
                if (containers.length) {
                    heading('Containers');
                    printTable(
                        ['Name', 'Image', 'Ports'],
                        containers.map((c) => [
                            c.name,
                            c.image,
                            (c.ports || []).map((p) => `${p.containerPort}/${p.protocol || 'TCP'}`).join(', ') || '—',
                        ])
                    );
                }

                const containerStatuses = status.containerStatuses || [];
                if (containerStatuses.length) {
                    heading('Container Statuses');
                    printTable(
                        ['Name', 'Ready', 'Restarts', 'State'],
                        containerStatuses.map((cs) => {
                            const state = cs.state
                                ? Object.keys(cs.state)[0] || 'unknown'
                                : 'unknown';
                            return [
                                cs.name,
                                cs.ready ? chalk.green('Yes') : chalk.red('No'),
                                String(cs.restartCount || 0),
                                statusColor(state),
                            ];
                        })
                    );
                }

                if (meta.labels) {
                    heading('Labels');
                    for (const [k, v] of Object.entries(meta.labels)) {
                        dim(`  ${k}: ${v}`);
                    }
                }
            } catch (err) {
                error(err.message);
            }
        });

    // pods (shortcut alias for `pod list`) 
    program
        .command('pods')
        .description('List pods (shortcut for `pod list`)')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            // Delegate to pod list
            await pod.commands.find((c) => c.name() === 'list')
                .parseAsync(['list', ...(opts.namespace ? ['-n', opts.namespace] : []), ...(opts.json ? ['--json'] : [])], { from: 'user' })
                .catch(() => {
                    // Fallback: directly call the action
                    requireAuth();
                    const clusterId = requireCluster();
                    const namespace = opts.namespace || getNamespace();
                    return apiGet(`/api/clusters/${clusterId}/pods`, { namespace })
                        .then((data) => {
                            if (handleJsonOutput(opts, data)) return;
                            const pods = data.pods || [];
                            if (!pods.length) {
                                error(`No pods found in namespace "${namespace}".`);
                                return;
                            }
                            printTable(
                                ['Name', 'Status', 'Restarts', 'Age'],
                                pods.map((p) => [
                                    p.metadata?.name || p.name || '—',
                                    statusColor(p.status?.phase || p.status || 'Unknown'),
                                    String(p.status?.containerStatuses?.[0]?.restartCount ?? p.restarts ?? 0),
                                    formatDate(p.status?.startTime || p.metadata?.creationTimestamp),
                                ])
                            );
                        });
                });
        });
}
