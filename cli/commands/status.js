import { Command } from 'commander';
import chalk from 'chalk';
import { apiGet } from '../utils/api.util.js';
import { requireAuth, requireCluster, getNamespace, loadConfig } from '../utils/config.util.js';
import {
    error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate,
} from '../utils/output.util.js';

export function registerStatusCommand(program) {
    program
        .command('status')
        .alias('s')
        .description('Show cluster overview — pods, deployments, services')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();
                const namespace = opts.namespace || getNamespace();
                const config = loadConfig();

                const data = await withSpinner('Fetching cluster overview...', () =>
                    apiGet(`/api/clusters/${clusterId}/overview`, { namespace })
                );

                if (handleJsonOutput(opts, data)) return;

                // Header
                console.log('');
                console.log(chalk.bold.cyan('╔═══════════════════════════════════════╗'));
                console.log(chalk.bold.cyan('║') + chalk.bold.white('   DevOpsEase — Cluster Overview       ') + chalk.bold.cyan('║'));
                console.log(chalk.bold.cyan('╚═══════════════════════════════════════╝'));
                console.log('');
                info(`Cluster:    ${config.currentCluster}`);
                info(`Namespace:  ${namespace}`);

                // Pods
                const pods = data.pods || [];
                heading(`Pods (${pods.length})`);
                if (pods.length) {
                    printTable(
                        ['Name', 'Status', 'Restarts', 'Age'],
                        pods.map((p) => [
                            p.metadata?.name || p.name || '—',
                            statusColor(p.status?.phase || p.status || 'Unknown'),
                            String(p.status?.containerStatuses?.[0]?.restartCount ?? p.restarts ?? 0),
                            formatDate(p.status?.startTime || p.metadata?.creationTimestamp),
                        ])
                    );
                } else {
                    console.log(chalk.dim('  No pods found.'));
                }

                // Deployments
                const deployments = data.deployments || [];
                heading(`Deployments (${deployments.length})`);
                if (deployments.length) {
                    printTable(
                        ['Name', 'Ready', 'Up-to-date', 'Available'],
                        deployments.map((d) => {
                            const status = d.status || {};
                            return [
                                d.metadata?.name || d.name || '—',
                                `${status.readyReplicas || 0}/${status.replicas || 0}`,
                                String(status.updatedReplicas || 0),
                                String(status.availableReplicas || 0),
                            ];
                        })
                    );
                } else {
                    console.log(chalk.dim('  No deployments found.'));
                }

                // Services
                const services = data.services || [];
                heading(`Services (${services.length})`);
                if (services.length) {
                    printTable(
                        ['Name', 'Type', 'Cluster IP', 'Ports'],
                        services.map((s) => {
                            const spec = s.spec || {};
                            return [
                                s.metadata?.name || s.name || '—',
                                spec.type || 'ClusterIP',
                                spec.clusterIP || '—',
                                (spec.ports || [])
                                    .map((p) => `${p.port}:${p.targetPort || p.port}`)
                                    .join(', ') || '—',
                            ];
                        })
                    );
                } else {
                    console.log(chalk.dim('  No services found.'));
                }

                console.log('');
            } catch (err) {
                error(err.message);
            }
        });
}
