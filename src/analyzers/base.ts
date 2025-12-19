import { AnalyzerResult } from '../types';

/**
 * Base abstract class for all static analysis tools.
 * Implements the Strategy pattern to enable easy addition of new analyzers.
 */
export abstract class BaseAnalyzer {
  /**
   * Analyze the smart contract at the given path.
   * @param targetPath Path to a Solidity file or directory containing Solidity files
   * @returns AnalyzerResult with detectors, errors, and supplementary data
   */
  abstract analyze(targetPath: string): Promise<AnalyzerResult>;

  /**
   * Check if the analyzer tool is installed and available.
   * @returns true if tool is installed, false otherwise
   */
  abstract checkInstallation(): Promise<boolean>;

  /**
   * Get the name of this analyzer tool.
   * @returns Tool name (e.g., "Slither", "Mythril")
   */
  abstract getToolName(): string;

  /**
   * Get the version of the analyzer tool.
   * @returns Version string or "unknown" if not available
   */
  async getVersion(): Promise<string> {
    return 'unknown';
  }
}
