import { Command } from 'commander';
import chalk from 'chalk';
import { apiGet, apiPost } from '../utils/api.util.js';
import { requireAuth, requireCluster, getNamespace } from '../utils/config.util.js';
import {
    success, error, info, heading,
    printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerK8sCommands(program) {
    const k8s = program.command('k8s').description('Kubernetes deployment operations');

    // k8s deploy list 
    const k8sDeploy = k8s.command('deploy').description('Manage Kubernetes deployments');

    k8sDeploy
        .command('list')
        .description('List Kubernetes deployments')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();
                const namespace = opts.namespace || getNamespace();

                const data = await withSpinner('Fetching K8s deployments...', () =>
                    apiGet(`/api/clusters/${clusterId}/overview`, { namespace })
                );

                if (handleJsonOutput(opts, data)) return;

                const deployments = data.deployments || [];
                if (!deployments.length) {
                    error(`No deployments found in namespace "${namespace}".`);
                    return;
                }

                printTable(
                    ['Name', 'Ready', 'Up-to-date', 'Available', 'Age'],
                    deployments.map((d) => {
                        const name = d.metadata?.name || d.name || '—';
                        const status = d.status || {};
                        const ready = `${status.readyReplicas || 0}/${status.replicas || 0}`;
                        const upToDate = String(status.updatedReplicas || 0);
                        const available = String(status.availableReplicas || 0);
                        const age = formatDate(d.metadata?.creationTimestamp || d.createdAt);
                        return [name, ready, upToDate, available, age];
                    })
                );
            } catch (err) {
                error(err.message);
            }
        });

    // k8s scale <deployment> --replicas N 
    k8s
        .command('scale <deployment>')
        .description('Scale a Kubernetes deployment')
        .requiredOption('-r, --replicas <count>', 'Number of replicas')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (deployment, opts) => {
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
                    `Scaling ${deployment} to ${replicas} replicas...`,
                    () =>
                        apiPost(`/api/clusters/${clusterId}/deployments/${deployment}/scale`, {
                            namespace,
                            replicas,
                        })
                );

                if (handleJsonOutput(opts, data)) return;

                success(`Scaled "${deployment}" to ${data.replicas ?? replicas} replicas.`);
                if (data.previousReplicas != null) {
                    info(`Previous: ${data.previousReplicas} → Now: ${data.replicas}`);
                }
            } catch (err) {
                error(err.message);
            }
        });

    // k8s describe deployment <name> 
    k8s
        .command('describe <type> <name>')
        .description('Describe a Kubernetes resource (e.g., deployment)')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (type, name, opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();
                const namespace = opts.namespace || getNamespace();

                if (type !== 'deployment') {
                    error(`Describe is currently supported for "deployment". Got "${type}".`);
                    return;
                }

                const data = await withSpinner(`Describing ${type} ${name}...`, () =>
                    apiGet(`/api/clusters/${clusterId}/overview`, { namespace })
                );

                if (handleJsonOutput(opts, data)) return;

                const deployments = data.deployments || [];
                const dep = deployments.find(
                    (d) => (d.metadata?.name || d.name) === name
                );

                if (!dep) {
                    error(`Deployment "${name}" not found in namespace "${namespace}".`);
                    return;
                }

                const meta = dep.metadata || {};
                const spec = dep.spec || {};
                const status = dep.status || {};

                heading(`Deployment: ${name}`);
                info(`Namespace:       ${meta.namespace || namespace}`);
                info(`Replicas:        ${status.readyReplicas || 0}/${status.replicas || 0} ready`);
                info(`Updated:         ${status.updatedReplicas || 0}`);
                info(`Available:       ${status.availableReplicas || 0}`);
                info(`Strategy:        ${spec.strategy?.type || '—'}`);
                info(`Created:         ${formatDate(meta.creationTimestamp)}`);

                // Container specs
                const containers = spec.template?.spec?.containers || [];
                if (containers.length) {
                    heading('Containers');
                    printTable(
                        ['Name', 'Image', 'Ports'],
                        containers.map((c) => [
                            c.name,
                            c.image,
                            (c.ports || []).map((p) => `${p.containerPort}`).join(', ') || '—',
                        ])
                    );
                }

                // Conditions
                const conditions = status.conditions || [];
                if (conditions.length) {
                    heading('Conditions');
                    printTable(
                        ['Type', 'Status', 'Reason', 'Last Update'],
                        conditions.map((c) => [
                            c.type,
                            c.status === 'True' ? chalk.green(c.status) : chalk.yellow(c.status),
                            c.reason || '—',
                            formatDate(c.lastUpdateTime || c.lastTransitionTime),
                        ])
                    );
                }

                if (meta.labels) {
                    heading('Labels');
                    for (const [k, v] of Object.entries(meta.labels)) {
                        console.log(chalk.dim(`  ${k}: ${v}`));
                    }
                }
            } catch (err) {
                error(err.message);
            }
        });
}
