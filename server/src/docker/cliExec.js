import { spawn } from "child_process";

export function runDockerCommand(command, args, options = {}) {
  const { cwd, onStdout, onStderr } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      env: process.env,
    });

    child.stdout.on("data", (chunk) => {
      if (onStdout) onStdout(chunk.toString());
    });

    child.stderr.on("data", (chunk) => {
      if (onStderr) onStderr(chunk.toString());
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code });
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

export default { runDockerCommand };
