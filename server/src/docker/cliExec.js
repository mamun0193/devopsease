import { spawn } from "child_process";

export function runDockerCommand(command, args, options = {}) {
  const { cwd, onStdout, onStderr } = options;
  const timeoutMs = 15 * 60 * 1000; // 15 minutes max execution

  return new Promise((resolve, reject) => {
    let timeoutHandle;
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      env: process.env,
    });

    const cleanup = () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };

    timeoutHandle = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command ${command} ${args.join(" ")} exceeded 15 minute timeout`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      if (onStdout) onStdout(chunk.toString());
    });

    child.stderr.on("data", (chunk) => {
      if (onStderr) onStderr(chunk.toString());
    });

    child.on("error", (error) => {
      cleanup();
      reject(error);
    });

    child.on("close", (code) => {
      cleanup();
      if (code === 0) {
        resolve({ code });
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

export default { runDockerCommand };
