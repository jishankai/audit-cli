import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { AnalyzerResult, AnalyzerDetector, AnalyzerSeverity, SlitherDetector } from '../types';
import { BaseAnalyzer } from './base';

const execAsync = promisify(exec);

export class SlitherAnalyzer extends BaseAnalyzer {
  getToolName(): string {
    return 'Slither';
  }

  async checkInstallation(): Promise<boolean> {
    try {
      await execAsync('slither --version');
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
          tool: 'slither',
          success: false,
          errors: ['Slither is not installed. Please install it with: pip3 install slither-analyzer'],
          detectors: [],
          supplementaryData: {}
        };
      }

      const isDirectory = (await fs.stat(targetPath)).isDirectory();
      const basePath = isDirectory ? targetPath : path.dirname(targetPath);

      const detectorsOutput = await this.runSlitherDetectors(targetPath);
      const irCode = await this.extractIR(targetPath);
      const printers = await this.runSlitherPrinters(basePath);

      const rawDetectors = this.parseDetectors(detectorsOutput);
      const detectors = rawDetectors.map(d => this.convertToUnifiedDetector(d));

      return {
        tool: 'slither',
        success: true,
        errors: [],
        detectors,
        supplementaryData: { printers, irCode }
      };
    } catch (error: any) {
      return {
        tool: 'slither',
        success: false,
        errors: [error.message],
        detectors: [],
        supplementaryData: {}
      };
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

  private parseDetectors(jsonOutput: string): SlitherDetector[] {
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

  private convertToUnifiedDetector(slitherDetector: SlitherDetector): AnalyzerDetector {
    return {
      id: slitherDetector.check,
      title: slitherDetector.check.replace(/-/g, ' ').toUpperCase(),
      severity: this.normalizeSeverity(slitherDetector.impact),
      description: slitherDetector.description || 'No description available',
      location: this.extractLocation(slitherDetector),
      source: 'slither',
      rawData: slitherDetector
    };
  }

  private normalizeSeverity(impact: string): AnalyzerSeverity {
    const map: Record<string, AnalyzerSeverity> = {
      'High': 'High',
      'Medium': 'Medium',
      'Low': 'Low',
      'Informational': 'Informational'
    };
    return map[impact] || 'Informational';
  }

  private extractLocation(detector: SlitherDetector): string {
    if (detector.elements && detector.elements.length > 0) {
      const element = detector.elements[0];
      if (element.source_mapping) {
        const mapping = element.source_mapping;
        const filename = mapping.filename_relative || mapping.filename_short || 'unknown';
        const line = mapping.lines && mapping.lines.length > 0 ? mapping.lines[0] : '?';
        return `${filename}:${line}`;
      }
    }
    return 'Unknown';
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
