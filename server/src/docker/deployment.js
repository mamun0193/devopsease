import { spawn } from 'child_process';

const DOCKER_CMD_TIMEOUT_MS = 60_000;
const MAX_ERROR_LOG_LENGTH = 5000;
const ENV_KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

export async function runContainer(imageTag, containerName, port, envVars = {}, { cpuLimit, memoryLimit } = {}) {
    // Determine internal port from image config
    let internalPort = '3000'; // Default
    try {
        const { stdout } = await execDocker(['inspect', '--format', '{{json .Config.ExposedPorts}}', imageTag], { timeoutMs: 10_000 });
        if (stdout && stdout.trim() !== 'null') {
            const portsObj = JSON.parse(stdout.trim());
            const ports = Object.keys(portsObj);
            if (ports.length > 0) {
                internalPort = ports[0].split('/')[0];
            }
        }
    } catch (err) {
        // Ignore and fallback to 3000
    }

    const args = [
        'run', '-d',
        '-p', `${port}:${internalPort}`,
        '-e', `PORT=${internalPort}`,
        '-e', `HOST=0.0.0.0`,
        '-e', `HOSTNAME=0.0.0.0`,
        '--name', containerName,
    ];

    // Apply CPU limit (Docker --cpus flag, e.g. '1', '4', '0.5')
    if (cpuLimit) {
        args.push('--cpus', String(cpuLimit));
    }

    // Apply memory limit (Docker --memory flag, e.g. '512m', '4g')
    if (memoryLimit) {
        args.push('--memory', String(memoryLimit));
    }

    if (envVars && typeof envVars === 'object' && !Array.isArray(envVars)) {
        for (const [key, rawValue] of Object.entries(envVars)) {
            if (!ENV_KEY_REGEX.test(key)) continue;
            args.push('-e', `${key}=${String(rawValue)}`);
        }
    }

    args.push(imageTag);

    const { stdout } = await execDocker(args);
    const containerId = stdout.split('\n').filter(Boolean).pop()?.trim();

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

export async function getContainerState(containerId) {
    try {
        const { stdout } = await execDocker(
            ['inspect', '--format', '{{.State.Status}}', containerId],
            { timeoutMs: 10_000 }
        );
        return stdout.trim(); // 'running', 'exited', 'paused', etc.
    } catch {
        return null; // container doesn't exist
    }
}

export async function getRunningContainerIds(containerIds) {
    const running = [];
    for (const id of containerIds) {
        const state = await getContainerState(id);
        if (state === 'running') {
            running.push(id);
        }
    }
    return running;
}
