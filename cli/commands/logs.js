import { Command } from 'commander';
import { apiGet } from '../utils/api.util.js';
import { requireAuth, requireCluster, getNamespace } from '../utils/config.util.js';
import { error, info, dim, handleJsonOutput, withSpinner } from '../utils/output.util.js';

export function registerLogsCommand(program) {
    program
        .command('logs <app>')
        .description('View pod logs (global shortcut)')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('-t, --tail <lines>', 'Number of lines to show', '100')
        .option('-f, --follow', 'Stream logs continuously (polls every 3s)')
        .option('-c, --container <container>', 'Container name')
        .option('--json', 'Output raw JSON')
        .action(async (app, opts) => {
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
                    info(`Streaming logs for ${app} (Ctrl+C to stop)...`);
                    let lastLineCount = 0;

                    const poll = async () => {
                        try {
                            const data = await apiGet(
                                `/api/clusters/${clusterId}/pods/${app}/logs`,
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
                    await new Promise(() => {});
                } else {
                    const data = await withSpinner(`Fetching logs for ${app}...`, () =>
                        apiGet(`/api/clusters/${clusterId}/pods/${app}/logs`, params)
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
}
