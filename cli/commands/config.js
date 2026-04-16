import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig, getConfigPath } from '../utils/config.util.js';
import { success, error, info, heading, dim } from '../utils/output.util.js';

export function registerConfigCommands(program) {
    const config = program.command('config').description('Manage CLI configuration');

    // config show 
    config
        .command('show')
        .description('Show current configuration')
        .action(() => {
            try {
                const cfg = loadConfig();

                heading('DevOpsEase CLI Configuration');
                dim(`Config file: ${getConfigPath()}`);
                console.log('');

                const masked = (token) => {
                    if (!token) return chalk.dim('(not set)');
                    if (token.length <= 8) return '****';
                    return token.slice(0, 4) + '…' + token.slice(-4);
                };

                info(`Base URL:       ${cfg.baseUrl}`);
                info(`Token:          ${masked(cfg.token)}`);
                info(`Refresh Token:  ${masked(cfg.refreshToken)}`);
                info(`Cluster:        ${cfg.currentCluster || chalk.dim('(not set)')}`);
                info(`Namespace:      ${cfg.currentNamespace || 'default'}`);
                info(`Project:        ${cfg.currentProject || chalk.dim('(not set)')}`);
            } catch (err) {
                error(err.message);
            }
        });

    // config set-url <url> 
    config
        .command('set-url <url>')
        .description('Set the API base URL')
        .action((url) => {
            try {
                saveConfig({ baseUrl: url });
                success(`Base URL set to ${url}`);
            } catch (err) {
                error(err.message);
            }
        });

    // config set-project <id> 
    config
        .command('set-project <id>')
        .description('Set the current project/repo ID')
        .action((id) => {
            try {
                saveConfig({ currentProject: id });
                success(`Current project set to ${id}`);
            } catch (err) {
                error(err.message);
            }
        });

    // config reset 
    config
        .command('reset')
        .description('Reset configuration to defaults')
        .action(async () => {
            try {
                const { existsSync, unlinkSync } = await import('node:fs');
                const configPath = getConfigPath();
                if (existsSync(configPath)) {
                    unlinkSync(configPath);
                }
                success('Configuration reset to defaults.');
            } catch (err) {
                error(err.message);
            }
        });
}
