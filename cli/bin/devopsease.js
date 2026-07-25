#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

// Program metadata 
program
    .name('devopsease')
    .description(
        chalk.bold.cyan('DevOpsEase CLI') +
        chalk.dim(' — Unified terminal interface for deployments, Kubernetes, CI/CD & observability')
    )
    .version('1.1.0', '-v, --version', 'Show CLI version')
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

// ── Dynamically register all command groups ──
const commandsDir = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const fileUrl = pathToFileURL(path.join(commandsDir, file)).href;
        const module = await import(fileUrl);
        for (const key of Object.keys(module)) {
            if (typeof module[key] === 'function' && key.startsWith('register')) {
                module[key](program);
            }
        }
    } catch (err) {
        console.error(chalk.red(`Failed to load command module ${file}:`), err.message);
    }
}

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
