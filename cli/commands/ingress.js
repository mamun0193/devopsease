import { Command } from 'commander';
import { apiGet } from '../utils/api.util.js';
import { requireAuth, requireCluster, getNamespace } from '../utils/config.util.js';
import {
    error, printTable,
    handleJsonOutput, withSpinner,
} from '../utils/output.util.js';

export function registerIngressCommands(program) {
    const ingress = program.command('ingress').description('Manage Kubernetes ingresses');

    // ingress list 
    ingress
        .command('list')
        .description('List ingresses in the current namespace')
        .option('-n, --namespace <namespace>', 'Override namespace')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const clusterId = requireCluster();
                const namespace = opts.namespace || getNamespace();

                const data = await withSpinner('Fetching ingresses...', () =>
                    apiGet(`/api/clusters/${clusterId}/overview`, { namespace })
                );

                if (handleJsonOutput(opts, data)) return;

                const ingresses = data.ingresses || [];
                if (!ingresses.length) {
                    error(`No ingresses found in namespace "${namespace}".`);
                    return;
                }

                printTable(
                    ['Name', 'Hosts', 'Ports', 'Age'],
                    ingresses.map((i) => {
                        const meta = i.metadata || {};
                        const spec = i.spec || {};
                        const name = meta.name || i.name || '—';
                        const hosts = (spec.rules || [])
                            .map((r) => r.host || '*')
                            .join(', ') || '—';
                        const ports = (spec.tls || []).length ? '443' : '80';
                        const age = meta.creationTimestamp
                            ? new Date(meta.creationTimestamp).toLocaleDateString()
                            : '—';
                        return [name, hosts, ports, age];
                    })
                );
            } catch (err) {
                error(err.message);
            }
        });
}
