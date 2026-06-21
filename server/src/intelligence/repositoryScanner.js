import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  'target',
  'vendor',
  'bin',
  'obj'
]);

// Recursively scans a directory and returns a flat list of paths.
// Identifies environment files.
 
export async function scanRepository(rootPath) {
  const filePaths = [];
  const dirPaths = [];
  const envFiles = [];

  async function walk(currentPath) {
    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch (err) {
      return; // Ignore unreadable directories
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const relPath = relative(rootPath, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        dirPaths.push(relPath);
        await walk(fullPath);
      } else if (entry.isFile()) {
        filePaths.push(relPath);
        if (entry.name.startsWith('.env')) {
          envFiles.push(relPath);
        }
      }
    }
  }

  await walk(rootPath);

  return {
    files: filePaths,
    directories: dirPaths,
    envFiles,
    rootPath
  };
}
