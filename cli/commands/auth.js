import { Command } from 'commander';
import inquirer from 'inquirer';
import { getRawClient } from '../utils/api.util.js';
import { saveConfig, clearAuth, loadConfig } from '../utils/config.util.js';
import { apiGet } from '../utils/api.util.js';
import { success, error, info, heading, handleJsonOutput, withSpinner } from '../utils/output.util.js';

export function registerAuthCommands(program) {
    // login 
    program
        .command('login')
        .description('Authenticate with DevOpsEase')
        .action(async (opts) => {
            try {
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'email',
                        message: 'Email:',
                        validate: (v) => (v.includes('@') ? true : 'Enter a valid email'),
                    },
                    {
                        type: 'password',
                        name: 'password',
                        message: 'Password:',
                        mask: '*',
                        validate: (v) => (v.length >= 6 ? true : 'Password must be at least 6 characters'),
                    },
                ]);

                await withSpinner('Authenticating...', async (spinner) => {
                    const client = getRawClient();
                    const res = await client.post('/auth/login', {
                        email: answers.email,
                        password: answers.password,
                    });

                    // Extract cookies from Set-Cookie header
                    const setCookies = res.headers['set-cookie'] || [];
                    let accessToken = '';
                    let refreshToken = '';

                    for (const cookie of setCookies) {
                        const atMatch = cookie.match(/access_token=([^;]+)/);
                        if (atMatch) accessToken = atMatch[1];

                        const rtMatch = cookie.match(/refresh_token=([^;]+)/);
                        if (rtMatch) refreshToken = rtMatch[1];
                    }

                    if (!accessToken) {
                        throw new Error('Login succeeded but no token received. Check server configuration.');
                    }

                    saveConfig({ token: accessToken, refreshToken });

                    spinner.text = `Logged in as ${res.data.user?.email || answers.email}`;
                });
            } catch (err) {
                error(err.message);
            }
        });

    // logout 
    program
        .command('logout')
        .description('Clear stored credentials')
        .action(async (opts) => {
            clearAuth();
            success('Logged out. Credentials cleared.');
        });

    // ── whoami ──
    program
        .command('whoami')
        .description('Show current user profile')
        .option('--json', 'Output raw JSON')
        .action(async (opts) => {
            try {
                const data = await withSpinner('Fetching profile...', async () => {
                    return apiGet('/auth/me');
                });

                if (handleJsonOutput(opts, data)) return;

                if (!data.isAuthenticated) {
                    error('Not authenticated. Run `devopsease login`.');
                    return;
                }

                heading('Current User');
                info(`Name:  ${data.user.name}`);
                info(`Email: ${data.user.email}`);
                info(`Role:  ${data.user.role}`);
                info(`Plan:  ${data.user.plan}`);
            } catch (err) {
                error(err.message);
            }
        });

    // ── auth token ──
    const authCmd = program.command('auth').description('Manage authentication and tokens');
    const tokenCmd = authCmd.command('token').description('Manage Personal Access Tokens (PATs)');

    tokenCmd
        .command('set <token>')
        .description('Authenticate using a Personal Access Token')
        .action((token) => {
            saveConfig({ token, refreshToken: '' });
            success('Token saved successfully. Run `devopsease whoami` to verify.');
        });

    tokenCmd
        .command('clear')
        .description('Clear stored token')
        .action(() => {
            clearAuth();
            success('Token cleared.');
        });

    tokenCmd
        .command('validate')
        .description('Validate current token')
        .action(async () => {
            try {
                const data = await withSpinner('Validating token...', async () => {
                    return apiGet('/auth/me');
                });
                if (data.isAuthenticated) {
                    success(`Token is valid. Authenticated as ${data.user.email}`);
                } else {
                    error('Token is invalid or expired.');
                }
            } catch (err) {
                if (err.message.includes('Session expired')) {
                    error('Token is invalid or expired.');
                } else {
                    error(err.message);
                }
            }
        });

    tokenCmd
        .command('create')
        .description('Create a new PAT (requires active login session)')
        .requiredOption('-n, --name <name>', 'Token name')
        .option('-d, --days <days>', 'Expiration in days', '30')
        .action(async (opts) => {
            try {
                const data = await withSpinner('Creating PAT...', async () => {
                    return apiGet('/auth/me').then(async (me) => {
                         if (!me.isAuthenticated) throw new Error('Not logged in.');
                         const { apiPost } = await import('../utils/api.util.js');
                         return apiPost('/auth/pats', { name: opts.name, expiresDays: parseInt(opts.days, 10) });
                    });
                });
                success(`Token created successfully: ${data.pat.name}`);
                console.log(`\n  ${data.token}\n`);
                info('Copy this token now. You will not be able to see it again.');
            } catch (err) {
                error(err.message);
            }
        });
}
