import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { apiGet, apiPost } from '../utils/api.util.js';
import { requireAuth, saveConfig, loadConfig } from '../utils/config.util.js';
import {
    success, error, info, printTable, statusColor,
    handleJsonOutput, withSpinner, formatDate, truncate,
} from '../utils/output.util.js';

export function registerClusterCommands(program) {
    const cluster = program.command('cluster').description('Manage Kubernetes clusters');

    // cluster list 
    cluster
        .command('list')
        .description('List connected clusters')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                requireAuth();
                const data = await withSpinner('Fetching clusters...', () =>
                    apiGet('/api/clusters')
                );

                if (handleJsonOutput(opts, data)) return;

                const clusters = data.clusters || [];
                if (!clusters.length) {
                    error('No clusters found. Connect one with `devopsease cluster connect`.');
                    return;
                }

                const config = loadConfig();
                printTable(
                    ['', 'ID', 'Name', 'Status', 'Connected'],
                    clusters.map((c) => [
                        c._id === config.currentCluster ? '→' : ' ',
                        truncate(c._id, 12),
                        c.name,
                        statusColor(c.status),
                        formatDate(c.createdAt),
                    ])
                );
            } catch (err) {
                error(err.message);
            }
        });

    // cluster connect 
    cluster
        .command('connect')
        .description('Connect a new Kubernetes cluster')
        .action(async () => {
            try {
                requireAuth();
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'name',
                        message: 'Cluster name:',
                        validate: (v) => !!v || 'Required',
                    },
                    {
                        type: 'input',
                        name: 'kubeconfigPath',
                        message: 'Path to kubeconfig file:',
                        default: path.join(process.env.HOME || process.env.USERPROFILE || '', '.kube', 'config'),
                        validate: (v) => {
                            if (!v) return 'Required';
                            if (!fs.existsSync(v)) return `File not found: ${v}`;
                            return true;
                        },
                    },
                ]);

                const kubeconfig = fs.readFileSync(answers.kubeconfigPath, 'utf-8');

                const data = await withSpinner('Connecting cluster...', () =>
                    apiPost('/api/clusters/connect', {
                        name: answers.name,
                        kubeconfig,
                    })
                );

                const clusterId = data.cluster?._id;
                if (clusterId) {
                    saveConfig({ currentCluster: clusterId });
                    success(`Cluster "${answers.name}" connected and set as current.`);
                } else {
                    success(`Cluster "${answers.name}" connected.`);
                }
            } catch (err) {
                error(err.message);
            }
        });

    // cluster use <id> 
    cluster
        .command('use <id>')
        .description('Set active cluster for subsequent commands')
        .action(async (id) => {
            try {
                saveConfig({ currentCluster: id });
                success(`Active cluster set to ${id}`);
                info('All cluster commands will now use this cluster by default.');
            } catch (err) {
                error(err.message);
            }
        });
}
