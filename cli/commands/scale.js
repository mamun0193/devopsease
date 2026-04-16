import { Command } from 'commander';
import { apiPost } from '../utils/api.util.js';
import { requireAuth, requireCluster, getNamespace } from '../utils/config.util.js';
import { success, error, info, handleJsonOutput, withSpinner } from '../utils/output.util.js';

export function registerScaleCommand(program) {
    program
        .command('scale <app>')
        .description('Scale a deployment (global shortcut)')
        .requiredOption('-r, --replicas <count>', 'Number of replicas')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (app, opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();
                const namespace = opts.namespace || getNamespace();
                const replicas = parseInt(opts.replicas, 10);

                if (isNaN(replicas) || replicas < 0) {
                    error('Replicas must be a non-negative integer.');
                    return;
                }

                const data = await withSpinner(
                    `Scaling ${app} to ${replicas} replicas...`,
                    () =>
                        apiPost(`/api/clusters/${clusterId}/deployments/${app}/scale`, {
                            namespace,
                            replicas,
                        })
                );

                if (handleJsonOutput(opts, data)) return;

                success(`Scaled "${app}" to ${data.replicas ?? replicas} replicas.`);
                if (data.previousReplicas != null) {
                    info(`Previous: ${data.previousReplicas} → Now: ${data.replicas}`);
                }
            } catch (err) {
                error(err.message);
            }
        });
}
