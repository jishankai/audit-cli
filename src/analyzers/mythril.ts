import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { AnalyzerResult, AnalyzerDetector, AnalyzerSeverity } from '../types';
import { BaseAnalyzer } from './base';

const execAsync = promisify(exec);

interface MythrilIssue {
  swcID?: string;
  swc_id?: string;
  swcTitle?: string;
  title?: string;
  description?: string | { head?: string; tail?: string };
  severity?: string;
  locations?: Array<{ sourceMap?: string }>;
}

export class MythrilAnalyzer extends BaseAnalyzer {
  getToolName(): string {
    return 'Mythril';
  }

  async checkInstallation(): Promise<boolean> {
    try {
      await execAsync('myth version');
      return true;
    } catch {
      return false;
    }
  }

  async analyze(targetPath: string): Promise<AnalyzerResult> {
    try {
      // Check installation first
      if (!(await this.checkInstallation())) {
        return {
          tool: 'mythril',
          success: false,
          errors: ['Mythril is not installed. Install with: pip3 install mythril'],
          detectors: [],
          supplementaryData: {}
        };
      }

      const isDirectory = (await fs.stat(targetPath)).isDirectory();
      const solidityFiles = isDirectory
        ? await this.findSolidityFiles(targetPath)
        : [targetPath];

      const allDetectors: AnalyzerDetector[] = [];
      const allErrors: string[] = [];

      // Analyze each file (Mythril doesn't support directory analysis)
      for (const filePath of solidityFiles) {
        try {
          const fileDetectors = await this.analyzeFile(filePath);
          allDetectors.push(...fileDetectors);
        } catch (error: any) {
          allErrors.push(`Error analyzing ${path.basename(filePath)}: ${error.message}`);
        }
      }

      return {
        tool: 'mythril',
        success: allErrors.length === 0,
        errors: allErrors,
        detectors: allDetectors,
        supplementaryData: {}
      };
    } catch (error: any) {
      return {
        tool: 'mythril',
        success: false,
        errors: [error.message],
        detectors: [],
        supplementaryData: {}
      };
    }
  }

  private async findSolidityFiles(directory: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scan(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.sol')) {
          files.push(fullPath);
        }
      }
    }

    await scan(directory);
    return files;
  }

  private async analyzeFile(filePath: string): Promise<AnalyzerDetector[]> {
    // Use jsonv2 format (SWC-compliant)
    // Note: Removed --solv auto as it's not valid (Mythril auto-detects solc version)
    const command = `myth analyze "${filePath}" -o jsonv2 --execution-timeout 90 2>/dev/null || true`;

    const { stdout } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000  // 2 minute max
    });

    return this.parseOutput(stdout, filePath);
  }

  private parseOutput(output: string, filePath: string): AnalyzerDetector[] {
    if (!output || output.trim() === '') {
      return [];
    }

    try {
      const parsed = JSON.parse(output);

      // Handle both json and jsonv2 formats
      // jsonv2 returns an array with the first element containing the issues
      const issues: MythrilIssue[] = Array.isArray(parsed)
        ? (parsed[0]?.issues || [])
        : (parsed.issues || []);

      return issues.map(issue => this.convertMythrilIssue(issue, filePath));
    } catch (error) {
      console.warn(`Failed to parse Mythril output for ${path.basename(filePath)}`);
      return [];
    }
  }

  private convertMythrilIssue(issue: MythrilIssue, filePath: string): AnalyzerDetector {
    let description = '';
    if (typeof issue.description === 'string') {
      description = issue.description;
    } else if (issue.description?.head && issue.description?.tail) {
      description = `${issue.description.head}\n\n${issue.description.tail}`;
    } else if (issue.description?.head) {
      description = issue.description.head;
    } else {
      description = 'No description available';
    }

    let location = path.basename(filePath);
    if (issue.locations && issue.locations.length > 0 && issue.locations[0].sourceMap) {
      location = `${path.basename(filePath)} - ${issue.locations[0].sourceMap}`;
    }

    return {
      id: issue.swcID || issue.swc_id || 'MYTH-UNKNOWN',
      title: issue.swcTitle || issue.title || 'Unknown Issue',
      severity: this.normalizeSeverity(issue.severity),
      description,
      location,
      source: 'mythril',
      rawData: issue
    };
  }

  private normalizeSeverity(severity?: string): AnalyzerSeverity {
    const map: Record<string, AnalyzerSeverity> = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
      'informational': 'Informational'
    };
    return map[severity?.toLowerCase() || ''] || 'Informational';
  }
}
