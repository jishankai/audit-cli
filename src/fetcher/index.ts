import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { SourceType } from '../types';

export class SourceFetcher {
  private tempDir: string;

  constructor() {
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-cli-'));
  }

  async fetch(sourceType: SourceType, sourcePath: string, targetFile?: string): Promise<string> {
    if (sourceType === SourceType.GITHUB) {
      return this.fetchFromGitHub(sourcePath, targetFile);
    } else {
      return this.fetchFromLocal(sourcePath, targetFile);
    }
  }

  private async fetchFromGitHub(repoUrl: string, targetFile?: string): Promise<string> {
    await fs.ensureDir(this.tempDir);

    const repoName = this.extractRepoName(repoUrl);
    const clonePath = path.join(this.tempDir, repoName);

    if (await fs.pathExists(clonePath)) {
      await fs.remove(clonePath);
    }

    const git: SimpleGit = simpleGit();
    await git.clone(repoUrl, clonePath);

    if (targetFile) {
      const filePath = path.join(clonePath, targetFile);
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`File ${targetFile} not found in repository`);
      }
      return filePath;
    }

    return clonePath;
  }

  private async fetchFromLocal(sourcePath: string, targetFile?: string): Promise<string> {
    const resolvedPath = path.resolve(sourcePath);

    if (!(await fs.pathExists(resolvedPath))) {
      throw new Error(`Path ${resolvedPath} does not exist`);
    }

    if (targetFile) {
      const filePath = path.join(resolvedPath, targetFile);
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`File ${targetFile} not found at ${resolvedPath}`);
      }
      return filePath;
    }

    return resolvedPath;
  }

  private extractRepoName(repoUrl: string): string {
    const match = repoUrl.match(/\/([^\/]+?)(\.git)?$/);
    return match ? match[1].replace('.git', '') : 'repo';
  }

  async cleanup(): Promise<void> {
    if (await fs.pathExists(this.tempDir)) {
      await fs.remove(this.tempDir);
    }
  }

  async listSolidityFiles(directoryPath: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath);
          }
        } else if (entry.name.endsWith('.sol')) {
          files.push(fullPath);
        }
      }
    }

    await walk(directoryPath);
    return files;
  }
}
