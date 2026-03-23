import fs from "fs";
import path from "path";
import { validateSafePath } from "../utils/workspace.js";

const PROJECT_TYPES = {
  DOCKER: "docker",
  COMPOSE: "compose",
  NODE: "node",
  PYTHON: "python",
  UNKNOWN: "unknown",
};

const DETECTABLE_FILES = {
  DOCKERFILE: "Dockerfile",
  COMPOSE_YML: "docker-compose.yml",
  COMPOSE_YAML: "docker-compose.yaml",
  PACKAGE_JSON: "package.json",
  REQUIREMENTS: "requirements.txt",
};

function fileExists(targetPath) {
  return fs.existsSync(targetPath);
}

function wrapDetectionError(message, error) {
  const details = error?.message ? `: ${error.message}` : "";
  return new Error(`${message}${details}`);
}

function resolveRepoPath(repoPath) {
  if (!repoPath || typeof repoPath !== "string") {
    throw new Error("Repository path is required");
  }

  let safePath;
  try {
    safePath = validateSafePath(repoPath);
  } catch (error) {
    throw wrapDetectionError("Invalid repository path", error);
  }

  if (!fileExists(safePath)) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }

  let stats;
  try {
    stats = fs.statSync(safePath);
  } catch (error) {
    throw wrapDetectionError(`Unable to read repository path: ${repoPath}`, error);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Repository path is not a directory: ${repoPath}`);
  }

  return safePath;
}

function detectTypeFromConfig(config) {
  if (config.hasCompose) return PROJECT_TYPES.COMPOSE;
  if (config.hasDockerfile) return PROJECT_TYPES.DOCKER;
  if (config.hasPackageJson) return PROJECT_TYPES.NODE;
  if (config.hasRequirements) return PROJECT_TYPES.PYTHON;
  return PROJECT_TYPES.UNKNOWN;
}

function collectDetectedFiles(config) {
  const detectedFiles = [];

  if (config.hasComposeYml) detectedFiles.push(DETECTABLE_FILES.COMPOSE_YML);
  if (config.hasComposeYaml) detectedFiles.push(DETECTABLE_FILES.COMPOSE_YAML);
  if (config.hasDockerfile) detectedFiles.push(DETECTABLE_FILES.DOCKERFILE);
  if (config.hasPackageJson) detectedFiles.push(DETECTABLE_FILES.PACKAGE_JSON);
  if (config.hasRequirements) detectedFiles.push(DETECTABLE_FILES.REQUIREMENTS);

  return detectedFiles;
}

function readNodeProjectInfo(rootPath, hasPackageJson) {
  if (!hasPackageJson) {
    return {
      name: null,
      hasStartScript: false,
    };
  }

  try {
    const packageJsonPath = path.join(rootPath, DETECTABLE_FILES.PACKAGE_JSON);
    const packageJsonRaw = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonRaw);

    return {
      name: typeof packageJson?.name === "string" ? packageJson.name : null,
      hasStartScript: Boolean(packageJson?.scripts?.start),
    };
  } catch {
    return {
      name: null,
      hasStartScript: false,
    };
  }
}

export async function detectProjectType(repoPath) {
  try {
    const rootPath = resolveRepoPath(repoPath);

    const hasDockerfile = fileExists(path.join(rootPath, DETECTABLE_FILES.DOCKERFILE));
    const hasComposeYml = fileExists(path.join(rootPath, DETECTABLE_FILES.COMPOSE_YML));
    const hasComposeYaml = fileExists(path.join(rootPath, DETECTABLE_FILES.COMPOSE_YAML));
    const hasCompose = hasComposeYml || hasComposeYaml;
    const hasPackageJson = fileExists(path.join(rootPath, DETECTABLE_FILES.PACKAGE_JSON));
    const hasRequirements = fileExists(path.join(rootPath, DETECTABLE_FILES.REQUIREMENTS));

    const config = {
      hasDockerfile,
      hasCompose,
      hasPackageJson,
      hasRequirements,
    };

    const node = readNodeProjectInfo(rootPath, hasPackageJson);
    const detectedFiles = collectDetectedFiles({
      hasDockerfile,
      hasComposeYml,
      hasComposeYaml,
      hasPackageJson,
      hasRequirements,
    });

    const type = detectTypeFromConfig(config);

    return {
      type,
      config,
      detectedFiles,
      node,
    };
  } catch (error) {
    throw wrapDetectionError(`Project detection failed for path: ${repoPath}`, error);
  }
}

export { PROJECT_TYPES };
export default { detectProjectType, PROJECT_TYPES };
