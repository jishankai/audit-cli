import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { SlitherResult } from '../types';

const execAsync = promisify(exec);

export class SlitherAnalyzer {
  async analyze(targetPath: string): Promise<SlitherResult> {
    try {
      await this.checkSlitherInstalled();

      const isDirectory = (await fs.stat(targetPath)).isDirectory();
      const basePath = isDirectory ? targetPath : path.dirname(targetPath);

      const detectorsOutput = await this.runSlitherDetectors(targetPath);
      const irCode = await this.extractIR(targetPath);
      const printers = await this.runSlitherPrinters(basePath);

      return {
        success: true,
        detectors: this.parseDetectors(detectorsOutput),
        printers,
        irCode,
        errors: []
      };
    } catch (error: any) {
      return {
        success: false,
        detectors: [],
        printers: {},
        errors: [error.message]
      };
    }
  }

  private async checkSlitherInstalled(): Promise<void> {
    try {
      await execAsync('slither --version');
    } catch (error) {
      throw new Error(
        'Slither is not installed. Please install it with: pip3 install slither-analyzer'
      );
    }
  }

  private async runSlitherDetectors(targetPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `slither "${targetPath}" --json - 2>/dev/null || true`
      );
      return stdout;
    } catch (error: any) {
      return error.stdout || '';
    }
  }

  private async extractIR(targetPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `slither "${targetPath}" --print human-summary 2>/dev/null || true`
      );
      return stdout;
    } catch (error: any) {
      return error.stdout || '';
    }
  }

  private async runSlitherPrinters(basePath: string): Promise<any> {
    const printers = [
      'human-summary',
      'contract-summary',
      'function-summary',
      'inheritance-graph'
    ];

    const results: any = {};

    for (const printer of printers) {
      try {
        const { stdout } = await execAsync(
          `slither "${basePath}" --print ${printer} 2>/dev/null || true`,
          { maxBuffer: 10 * 1024 * 1024 }
        );
        results[printer] = stdout;
      } catch (error: any) {
        results[printer] = error.stdout || '';
      }
    }

    return results;
  }

  private parseDetectors(jsonOutput: string): any[] {
    try {
      if (!jsonOutput || jsonOutput.trim() === '') {
        return [];
      }

      // Try direct parse first
      try {
        const parsed = JSON.parse(jsonOutput);
        if (parsed.results && parsed.results.detectors) {
          return parsed.results.detectors;
        }
        return [];
      } catch (e) {
        // Fallback: Try to extract JSON from mixed output
        const jsonMatch = jsonOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.results && parsed.results.detectors) {
            return parsed.results.detectors;
          }
        }
        return [];
      }
    } catch (error) {
      return [];
    }
  }

  async getDetailedAnalysis(targetPath: string): Promise<string> {
    try {
      const detectors = [
        'reentrancy-eth',
        'reentrancy-no-eth',
        'arbitrary-send-eth',
        'suicidal',
        'unprotected-upgrade',
        'delegatecall-loop',
        'controlled-delegatecall',
        'weak-prng',
        'domain-separator-collision',
        'reentrancy-benign',
        'timestamp',
        'assembly'
      ];

      const { stdout } = await execAsync(
        `slither "${targetPath}" --detect ${detectors.join(',')} 2>/dev/null || true`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      return stdout;
    } catch (error: any) {
      return error.stdout || '';
    }
  }
}
