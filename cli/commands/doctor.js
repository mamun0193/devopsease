import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, requireCluster } from '../utils/config.util.js';
import { apiGet } from '../utils/api.util.js';
import { heading, info, dim } from '../utils/output.util.js';

function check(label, ok, detail) {
    const icon = ok ? chalk.green('✔') : chalk.red('✖');
    const text = ok ? chalk.green(label) : chalk.red(label);
    console.log(`  ${icon} ${text}`);
    if (detail) {
        console.log(chalk.dim(`    └─ ${detail}`));
    }
}

export function registerDoctorCommand(program) {
    program
        .command('doctor')
        .description('Diagnose CLI health and connectivity')
        .action(async () => {
            heading('DevOpsEase Doctor');
            console.log('');

            const config = loadConfig();
            let allGood = true;

            // 1. Config file exists
            const hasConfig = !!config.baseUrl;
            check('Configuration loaded', hasConfig, hasConfig ? config.baseUrl : 'Run `devopsease config set-url <url>`');
            if (!hasConfig) allGood = false;

            // 2. API reachable
            let apiOk = false;
            try {
                // Try a lightweight endpoint
                await apiGet('/health');
                apiOk = true;
            } catch {
                try {
                    // Fallback: just hit the base URL
                    const { getRawClient } = await import('../utils/api.util.js');
                    const client = getRawClient();
                    await client.get('/health');
                    apiOk = true;
                } catch {
                    apiOk = false;
                }
            }
            check(
                'API server reachable',
                apiOk,
                apiOk ? `Connected to ${config.baseUrl}` : `Cannot reach ${config.baseUrl}. Is the server running?`
            );
            if (!apiOk) allGood = false;

            // 3. Token present
            const hasToken = !!config.token;
            check(
                'Authentication token',
                hasToken,
                hasToken ? 'Token stored' : 'Run `devopsease login` to authenticate'
            );
            if (!hasToken) allGood = false;

            // 4. Token valid (if present and API reachable)
            let tokenValid = false;
            if (hasToken && apiOk) {
                try {
                    const me = await apiGet('/auth/me');
                    tokenValid = me.isAuthenticated;
                } catch {
                    tokenValid = false;
                }
            }
            if (hasToken) {
                check(
                    'Token valid',
                    tokenValid,
                    tokenValid ? 'Session active' : 'Token expired. Run `devopsease login`'
                );
                if (!tokenValid) allGood = false;
            }

            // 5. Cluster selected
            const hasCluster = !!config.currentCluster;
            check(
                'Cluster selected',
                hasCluster,
                hasCluster
                    ? `Using cluster: ${config.currentCluster}`
                    : 'Run `devopsease cluster use <id>` to select a cluster'
            );
            if (!hasCluster) allGood = false;

            // 6. Namespace set
            const hasNamespace = !!config.currentNamespace;
            check(
                'Namespace set',
                hasNamespace,
                `Using namespace: ${config.currentNamespace || 'default'}`
            );

            // 7. Namespace exists (if cluster selected & API reachable & token valid)
            if (hasCluster && apiOk && tokenValid) {
                let nsExists = false;
                try {
                    const nsData = await apiGet(
                        `/api/clusters/${config.currentCluster}/namespaces`
                    );
                    const namespaces = nsData.namespaces || [];
                    nsExists = namespaces.some((n) => {
                        const name = typeof n === 'string' ? n : n.name || n.metadata?.name;
                        return name === config.currentNamespace;
                    });
                } catch {
                    nsExists = false;
                }
                check(
                    `Namespace "${config.currentNamespace}" exists in cluster`,
                    nsExists,
                    nsExists
                        ? 'Namespace verified'
                        : `Namespace not found. Create with \`devopsease ns create ${config.currentNamespace}\``
                );
                if (!nsExists) allGood = false;
            }

            // Summary
            console.log('');
            if (allGood) {
                console.log(chalk.bold.green('  ✔ All checks passed. You\'re good to go!'));
            } else {
                console.log(chalk.bold.yellow('  ⚠ Some issues detected. See suggestions above.'));
            }
            console.log('');
        });
}
