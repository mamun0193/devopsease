#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';

import { registerAuthCommands } from '../commands/auth.js';
import { registerRepoCommands } from '../commands/repo.js';
import { registerPipelineCommands } from '../commands/pipeline.js';
import { registerDeployCommands } from '../commands/deploy.js';
import { registerClusterCommands } from '../commands/cluster.js';
import { registerNamespaceCommands } from '../commands/namespace.js';
import { registerPodCommands } from '../commands/pods.js';
import { registerK8sCommands } from '../commands/k8s.js';
import { registerServiceCommands } from '../commands/service.js';
import { registerIngressCommands } from '../commands/ingress.js';
import { registerSecretCommands } from '../commands/secrets.js';
import { registerStatusCommand } from '../commands/status.js';
import { registerLogsCommand } from '../commands/logs.js';
import { registerScaleCommand } from '../commands/scale.js';
import { registerConfigCommands } from '../commands/config.js';
import { registerInitCommand } from '../commands/init.js';
import { registerDoctorCommand } from '../commands/doctor.js';
import { registerContainerCommands } from '../commands/container.js';
import { registerBuildCommands } from '../commands/build.js';
import { registerImageCommands } from '../commands/image.js';
import { registerProjectCommands } from '../commands/project.js';
import { registerNetworkCommands } from '../commands/network.js';
import { registerVolumeCommands } from '../commands/volume.js';
import { registerRegistryCommands } from '../commands/registry.js';
import { registerTunnelCommands } from '../commands/tunnel.js';

const program = new Command();

// Program metadata 
program
    .name('devopsease')
    .description(
        chalk.bold.cyan('DevOpsEase CLI') +
        chalk.dim(' — Unified terminal interface for deployments, Kubernetes, CI/CD & observability')
    )
    .version('1.0.0', '-v, --version', 'Show CLI version')
    .addHelpText('after', `
${chalk.bold('Aliases:')}
  ${chalk.cyan('dse')}                    Short for devopsease
  ${chalk.cyan('dse p')}                  Alias for ${chalk.dim('pod list')}
  ${chalk.cyan('dse d')}                  Alias for ${chalk.dim('deploy list')}
  ${chalk.cyan('dse s')}                  Alias for ${chalk.dim('status')}

${chalk.bold('Quick Start:')}
  ${chalk.dim('$')} devopsease login               Authenticate
  ${chalk.dim('$')} devopsease init                 Detect project & scaffold pipeline
  ${chalk.dim('$')} devopsease doctor               Check connectivity & setup
  ${chalk.dim('$')} devopsease cluster connect      Connect a K8s cluster
  ${chalk.dim('$')} devopsease status               View cluster overview

${chalk.bold('Global Shortcuts:')}
  ${chalk.dim('$')} devopsease logs <app>           View pod logs
  ${chalk.dim('$')} devopsease scale <app> -r 3     Scale deployment

${chalk.bold('All commands support:')}
  ${chalk.cyan('--json')}                 Output raw JSON (for scripting)
  ${chalk.cyan('--help')}                 Show command help
`);

// ── Register all command groups ──
registerAuthCommands(program);
registerRepoCommands(program);
registerPipelineCommands(program);
registerDeployCommands(program);
registerClusterCommands(program);
registerNamespaceCommands(program);
registerPodCommands(program);
registerK8sCommands(program);
registerServiceCommands(program);
registerIngressCommands(program);
registerSecretCommands(program);
registerStatusCommand(program);
registerLogsCommand(program);
registerScaleCommand(program);
registerConfigCommands(program);
registerInitCommand(program);
registerDoctorCommand(program);
registerContainerCommands(program);
registerBuildCommands(program);
registerImageCommands(program);
registerProjectCommands(program);
registerNetworkCommands(program);
registerVolumeCommands(program);
registerRegistryCommands(program);
registerTunnelCommands(program);

// Shortcut aliases 
// `dse p` → pod list
program
    .command('p')
    .description('Shortcut: list pods (same as `pod list`)')
    .option('-n, --namespace <namespace>', 'Override namespace')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
        // Re-parse as 'pod list'
        await program.parseAsync(['node', 'devopsease', 'pod', 'list',
            ...(opts.namespace ? ['-n', opts.namespace] : []),
            ...(opts.json ? ['--json'] : []),
        ]);
    });

// `dse d` → deploy list
program
    .command('d')
    .description('Shortcut: list deployments (same as `deploy list`)')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
        await program.parseAsync(['node', 'devopsease', 'deploy', 'list',
            ...(opts.json ? ['--json'] : []),
        ]);
    });

// Global error handling 
program.exitOverride();

try {
    await program.parseAsync(process.argv);
} catch (err) {
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
        process.exit(0);
    }
    if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
        // Commander already printed the error
        process.exit(1);
    }
    console.error(chalk.red(`\n✖ ${err.message}\n`));
    process.exit(1);
}
