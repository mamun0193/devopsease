import { Command } from 'commander';
import { apiGet } from '../utils/api.util.js';
import { requireAuth, requireCluster, getNamespace } from '../utils/config.util.js';
import {
    error, printTable, statusColor,
    handleJsonOutput, withSpinner,
} from '../utils/output.util.js';

export function registerServiceCommands(program) {
    const svc = program.command('service').description('Manage Kubernetes services');

    // service list 
    svc
        .command('list')
        .description('List services in the current namespace')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();
                const namespace = opts.namespace || getNamespace();

                const data = await withSpinner('Fetching services...', () =>
                    apiGet(`/api/clusters/${clusterId}/overview`, { namespace })
                );

                if (handleJsonOutput(opts, data)) return;

                const services = data.services || [];
                if (!services.length) {
                    error(`No services found in namespace "${namespace}".`);
                    return;
                }

                printTable(
                    ['Name', 'Type', 'Cluster IP', 'Ports', 'Age'],
                    services.map((s) => {
                        const meta = s.metadata || {};
                        const spec = s.spec || {};
                        const name = meta.name || s.name || '—';
                        const type = spec.type || 'ClusterIP';
                        const clusterIP = spec.clusterIP || '—';
                        const ports = (spec.ports || [])
                            .map((p) => `${p.port}${p.targetPort ? ':' + p.targetPort : ''}/${p.protocol || 'TCP'}`)
                            .join(', ') || '—';
                        const age = meta.creationTimestamp
                            ? new Date(meta.creationTimestamp).toLocaleDateString()
                            : '—';
                        return [name, type, clusterIP, ports, age];
                    })
                );
            } catch (err) {
                error(err.message);
            }
        });
}
