import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { apiGet, apiPost } from '../utils/api.util.js';
import { requireAuth } from '../utils/config.util.js';
import { success, error, info, warn, heading, dim, withSpinner } from '../utils/output.util.js';

// Project type detection rules
const PROJECT_SIGNATURES = [
    {
        type: 'Node.js',
        files: ['package.json'],
        icon: '📦',
        defaultSteps: ['build', 'test', 'deploy'],
        suggestion: 'npm install → npm test → docker build & push',
    },
    {
        type: 'Python',
        files: ['requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py'],
        icon: '🐍',
        defaultSteps: ['build', 'test', 'deploy'],
        suggestion: 'pip install → pytest → docker build & push',
    },
    {
        type: 'Go',
        files: ['go.mod'],
        icon: '🐹',
        defaultSteps: ['build', 'test', 'deploy'],
        suggestion: 'go build → go test → docker build & push',
    },
    {
        type: 'Java',
        files: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
        icon: '☕',
        defaultSteps: ['build', 'test', 'deploy'],
        suggestion: 'mvn/gradle build → test → docker build & push',
    },
    {
        type: 'Rust',
        files: ['Cargo.toml'],
        icon: '🦀',
        defaultSteps: ['build', 'test', 'deploy'],
        suggestion: 'cargo build → cargo test → docker build & push',
    },
    {
        type: 'Docker',
        files: ['Dockerfile'],
        icon: '🐳',
        defaultSteps: ['build', 'deploy'],
        suggestion: 'docker build & push → deploy',
    },
];

function detectProject(dir) {
    const results = [];
    for (const sig of PROJECT_SIGNATURES) {
        for (const file of sig.files) {
            if (fs.existsSync(path.join(dir, file))) {
                results.push(sig);
                break; // Only add each type once
            }
        }
    }
    return results;
}

export function registerInitCommand(program) {
    program
        .command('init')
        .description('Detect project type and scaffold a CI/CD pipeline')
        .option('-d, --dir <directory>', 'Project directory to scan', '.')
        .action(async (opts) => {
            try {
                const dir = path.resolve(opts.dir);

                heading('DevOpsEase — Project Init');
                info(`Scanning ${dir}...`);
                console.log('');

                const detected = detectProject(dir);

                if (!detected.length) {
                    warn('No recognizable project files found.');
                    dim('Supported: package.json, requirements.txt, go.mod, pom.xml, Cargo.toml, Dockerfile');
                    return;
                }

                // Show detected project types
                for (const sig of detected) {
                    success(`${sig.icon} Detected ${sig.type} project`);
                    dim(`  Suggested pipeline: ${sig.suggestion}`);
                }
                console.log('');

                // Check if Dockerfile exists
                const hasDockerfile = fs.existsSync(path.join(dir, 'Dockerfile'));
                if (!hasDockerfile) {
                    warn('No Dockerfile found. You will need one for container-based deployments.');
                }

                // Ask if they want to create a pipeline
                const { shouldCreate } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'shouldCreate',
                        message: 'Would you like to create a CI/CD pipeline now?',
                        default: true,
                    },
                ]);

                if (!shouldCreate) {
                    info('You can create a pipeline later with `devopsease pipeline create`.');
                    return;
                }

                requireAuth();

                // Fetch repos for selection
                const repoData = await apiGet('/api/repos');
                const repos = repoData.repositories || [];
                if (!repos.length) {
                    error('No repositories connected. Connect one first:');
                    dim('  devopsease repo connect');
                    return;
                }

                const primary = detected[0];
                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'repoId',
                        message: 'Select repository:',
                        choices: repos.map((r) => ({
                            name: `${r.owner}/${r.repoName}`,
                            value: r._id,
                        })),
                    },
                    {
                        type: 'input',
                        name: 'name',
                        message: 'Pipeline name:',
                        default: `${primary.type.toLowerCase()}-pipeline`,
                    },
                    {
                        type: 'checkbox',
                        name: 'steps',
                        message: 'Select pipeline steps:',
                        choices: primary.defaultSteps.map((s) => ({
                            name: s,
                            checked: true,
                        })),
                        validate: (v) => v.length > 0 || 'Select at least one step',
                    },
                ]);

                const yamlString = `steps:\n${answers.steps.map((s) => `  - ${s}`).join('\n')}`;

                const data = await withSpinner('Creating pipeline...', () =>
                    apiPost('/api/pipelines', {
                        repoId: answers.repoId,
                        yaml: yamlString,
                        name: answers.name,
                    })
                );

                console.log('');
                success(`Pipeline "${data.name}" created successfully! (v${data.version})`);
                console.log('');
                heading('Next Steps');
                dim('  1. Run your pipeline:');
                info(`     devopsease pipeline run ${data.id}`);
                dim('  2. Check status:');
                info(`     devopsease pipeline status ${data.id}`);
                dim('  3. View deployments:');
                info('     devopsease deploy list');
                console.log('');
            } catch (err) {
                error(err.message);
            }
        });
}
