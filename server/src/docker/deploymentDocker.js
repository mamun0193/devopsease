import { spawn } from 'child_process';

const DOCKER_CMD_TIMEOUT_MS = 60_000;
const MAX_ERROR_LOG_LENGTH = 5000;

function execDocker(args, { timeoutMs = DOCKER_CMD_TIMEOUT_MS } = {}) {
    return new Promise((resolve, reject) => {
        const stdoutChunks = [];
        const stderrChunks = [];

        const child = spawn('docker', args, {
            shell: process.platform === 'win32',
            env: process.env,
        });

        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error(`Docker command timed out after ${timeoutMs}ms: docker ${args.join(' ')}`));
        }, timeoutMs);

        child.stdout.on('data', (chunk) => stdoutChunks.push(chunk.toString()));
        child.stderr.on('data', (chunk) => stderrChunks.push(chunk.toString()));

        child.on('error', (error) => {
            clearTimeout(timer);
            reject(error);
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            const stdout = stdoutChunks.join('').trim();
            const stderr = stderrChunks.join('').trim();

            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }

            const errMsg = stderr || `docker ${args.join(' ')} exited with code ${code}`;
            const error = new Error(errMsg);
            error.stderr = stderr.slice(0, MAX_ERROR_LOG_LENGTH);
            error.exitCode = code;
            reject(error);
        });
    });
}

export async function runContainer(imageTag, containerName, port) {
    const args = [
        'run', '-d',
        '-p', `${port}:3000`,
        '--name', containerName,
        imageTag
    ];

    const { stdout } = await execDocker(args);
    const containerId = stdout.split('\n').pop().trim();

    if (!containerId) {
        throw new Error('docker run returned empty container ID');
    }

    return containerId;
}

export async function stopContainer(containerId) {
    await execDocker(['stop', containerId], { timeoutMs: 30_000 });
}

export async function removeContainer(containerId) {
    await execDocker(['rm', '-f', containerId], { timeoutMs: 30_000 });
}

export async function containerExists(containerName) {
    try {
        await execDocker(
            ['inspect', '--format', '{{.State.Status}}', containerName],
            { timeoutMs: 10_000 }
        );
        return true;
    } catch {
        return false;
    }
}
