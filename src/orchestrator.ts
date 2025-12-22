import ora, { Ora } from 'ora';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { AuditConfig, AuditReport, VulnerabilityFinding, AggregatedAnalyzerResult } from './types';
import { SourceFetcher } from './fetcher';
import { SlitherAnalyzer } from './analyzers/slither';
import { MythrilAnalyzer } from './analyzers/mythril';
import { BaseAnalyzer } from './analyzers/base';
import { LLMAuditor } from './auditor';
import { ReportGenerator } from './reporter';
import { InteractiveCLI } from './cli';

export class AuditOrchestrator {
  private fetcher: SourceFetcher;
  private analyzers: BaseAnalyzer[];
  private llmAuditor: LLMAuditor;
  private reportGenerator: ReportGenerator;
  private cli: InteractiveCLI;

  constructor() {
    this.fetcher = new SourceFetcher();
    this.analyzers = [
      new SlitherAnalyzer(),
      new MythrilAnalyzer()
    ];
    this.llmAuditor = new LLMAuditor();
    this.reportGenerator = new ReportGenerator();
    this.cli = new InteractiveCLI();
  }

  async runAudit(config: AuditConfig): Promise<void> {
    let spinner: Ora | undefined;

    try {
      // Display configuration summary
      this.cli.displayConfigSummary(config);

      // Step 1: Fetch source code
      spinner = ora({
        text: chalk.cyan('Fetching source code...'),
        spinner: 'dots',
        color: 'cyan'
      }).start();
      
      const targetPath = await this.fetcher.fetch(
        config.sourceType,
        config.sourcePath,
        config.targetFile
      );
      
      spinner.succeed(chalk.green('✓ Source code fetched successfully'));

      const isDirectory = (await fs.stat(targetPath)).isDirectory();
      const solidityFiles = isDirectory
        ? await this.fetcher.listSolidityFiles(targetPath)
        : [targetPath];

      console.log(chalk.blue('ℹ') + chalk.gray(` Found ${chalk.white.bold(solidityFiles.length)} Solidity file(s) to audit\n`));

      // Step 2: Static Analysis
      spinner = ora({
        text: chalk.cyan('Running static analysis tools (Slither + Mythril)...'),
        spinner: 'dots',
        color: 'cyan'
      }).start();
      
      const aggregatedResult = await this.runAllAnalyzers(targetPath);
      this.displayAnalyzerResults(aggregatedResult, spinner);

      // Step 3: AI Analysis with progress bar
      const aiProvider = this.llmAuditor.getProviderName();
      console.log(chalk.cyan.bold(`\n🤖 AI-Powered Analysis (${aiProvider})`));
      console.log(chalk.gray('─'.repeat(70)));
      
      const progressBar = new cliProgress.SingleBar({
        format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} files | {filename}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      });

      progressBar.start(solidityFiles.length, 0, { filename: 'Starting...' });
      
      const allFindings: VulnerabilityFinding[] = [];

      for (let i = 0; i < solidityFiles.length; i++) {
        const solidityFile = solidityFiles[i];
        const contractCode = await fs.readFile(solidityFile, 'utf-8');
        const fileName = path.basename(solidityFile);
        
        progressBar.update(i, { filename: fileName });
        
        const findings = await this.llmAuditor.auditContract(
          contractCode,
          aggregatedResult,
          config.vulnerabilityChecks,
          fileName
        );

        // Add file information to each finding
        findings.forEach(finding => {
          finding.affectedFiles = [fileName];
          if (!finding.location.includes(fileName)) {
            finding.location = `${fileName}: ${finding.location}`;
          }
        });

        allFindings.push(...findings);
      }

      progressBar.update(solidityFiles.length, { filename: 'Completed' });
      progressBar.stop();

      // Merge similar findings
      const mergedFindings = this.mergeFindings(allFindings);
      console.log(chalk.green(`✓ AI analysis completed - found ${chalk.bold(mergedFindings.length)} unique findings\n`));

      // Step 4: Comprehensive Analysis
      spinner = ora({
        text: chalk.cyan('Generating comprehensive analysis...'),
        spinner: 'dots',
        color: 'cyan'
      }).start();
      
      const comprehensiveAnalysis = solidityFiles.length === 1
        ? await this.llmAuditor.performComprehensiveAnalysis(solidityFiles[0], aggregatedResult)
        : await this.llmAuditor.generateProjectSummary(mergedFindings, aggregatedResult);
      
      spinner.succeed(chalk.green('✓ Comprehensive analysis completed'));

      const report: AuditReport = {
        projectName: path.basename(config.sourcePath),
        auditDate: new Date().toISOString(),
        summary: this.calculateSummary(mergedFindings),
        findings: mergedFindings,
        staticAnalysis: aggregatedResult,
        llmAnalysis: comprehensiveAnalysis
      };

      // Step 5: Generate Reports
      spinner = ora({
        text: chalk.cyan('Generating audit reports...'),
        spinner: 'dots',
        color: 'cyan'
      }).start();
      
      const reportPaths = await this.reportGenerator.generateReport(report, config.outputPath, config.reportFormats);
      const reportFileNames = reportPaths.map(p => path.basename(p));
      
      spinner.succeed(chalk.green(`✓ Report(s) generated: ${reportFileNames.join(', ')}`));

      // Display beautiful summary
      this.cli.displayAuditSummary(report.summary);

      // Display report locations
      console.log(chalk.cyan.bold('📁 Report Locations:'));
      reportPaths.forEach(rp => {
        console.log(chalk.gray('  • ') + chalk.white(rp));
      });
      console.log();

    } catch (error: any) {
      if (spinner) {
        spinner.fail(chalk.red('✗ Audit failed'));
      }
      this.cli.displayError(error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private calculateSummary(findings: VulnerabilityFinding[]) {
    return {
      totalIssues: findings.length,
      criticalIssues: findings.filter(f => f.severity === 'Critical').length,
      highIssues: findings.filter(f => f.severity === 'High').length,
      mediumIssues: findings.filter(f => f.severity === 'Medium').length,
      lowIssues: findings.filter(f => f.severity === 'Low').length,
      infoIssues: findings.filter(f => f.severity === 'Info').length
    };
  }

  /**
   * Merges similar findings to reduce report redundancy
   * Groups findings by type, severity, and similar titles
   */
  private mergeFindings(findings: VulnerabilityFinding[]): VulnerabilityFinding[] {
    if (findings.length === 0) return [];

    const merged: VulnerabilityFinding[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < findings.length; i++) {
      if (processed.has(i)) continue;

      const current = findings[i];
      const similar: VulnerabilityFinding[] = [current];

      // Find similar findings
      for (let j = i + 1; j < findings.length; j++) {
        if (processed.has(j)) continue;

        const candidate = findings[j];
        if (this.areSimilarFindings(current, candidate)) {
          similar.push(candidate);
          processed.add(j);
        }
      }

      // Merge similar findings
      if (similar.length > 1) {
        const mergedFinding = this.mergeSimilarFindings(similar);
        merged.push(mergedFinding);
      } else {
        merged.push(current);
      }

      processed.add(i);
    }

    return merged;
  }

  /**
   * Checks if two findings are similar enough to merge
   */
  private areSimilarFindings(a: VulnerabilityFinding, b: VulnerabilityFinding): boolean {
    // Must have same type and severity
    if (a.type !== b.type || a.severity !== b.severity) {
      return false;
    }

    // Check title similarity (simple approach: same or very similar)
    const titleA = a.title.toLowerCase().trim();
    const titleB = b.title.toLowerCase().trim();

    // Exact match
    if (titleA === titleB) {
      return true;
    }

    // Check if titles are similar (contain same keywords)
    const wordsA = new Set(titleA.split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(titleB.split(/\s+/).filter(w => w.length > 3));

    // Calculate similarity (Jaccard index)
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    const similarity = intersection.size / union.size;

    // Consider similar if >70% overlap in keywords
    return similarity > 0.7;
  }

  /**
   * Merges multiple similar findings into one
   */
  private mergeSimilarFindings(findings: VulnerabilityFinding[]): VulnerabilityFinding {
    const base = findings[0];

    // Collect all locations and files
    const allLocations: string[] = [];
    const allFiles = new Set<string>();

    findings.forEach(f => {
      allLocations.push(f.location);
      if (f.affectedFiles) {
        f.affectedFiles.forEach(file => allFiles.add(file));
      }
    });

    return {
      ...base,
      locations: allLocations,
      affectedFiles: Array.from(allFiles),
      occurrences: findings.length,
      // Update description to mention multiple occurrences if needed
      description: findings.length > 1
        ? `${base.description}\n\n**Note:** This issue was found in ${findings.length} location(s).`
        : base.description
    };
  }

  private async cleanup(): Promise<void> {
    try {
      await this.fetcher.cleanup();
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async runAllAnalyzers(targetPath: string): Promise<AggregatedAnalyzerResult> {
    // Run all analyzers in parallel with Promise.all
    const results = await Promise.all(
      this.analyzers.map(analyzer =>
        analyzer.analyze(targetPath).catch(error => ({
          tool: analyzer.getToolName().toLowerCase() as any,
          success: false,
          errors: [error.message],
          detectors: [],
          supplementaryData: {}
        }))
      )
    );

    return {
      results,
      allDetectors: results.flatMap(r => r.detectors),
      successCount: results.filter(r => r.success).length,
      totalTools: this.analyzers.length,
      errors: results.flatMap(r => r.errors)
    };
  }

  private displayAnalyzerResults(aggregated: AggregatedAnalyzerResult, spinner: any): void {
    const messages = aggregated.results.map(result => {
      const toolName = result.tool.charAt(0).toUpperCase() + result.tool.slice(1);
      return result.success
        ? `${toolName}: ${result.detectors.length} issue(s)`
        : `${toolName}: Failed`;
    });

    if (aggregated.successCount === aggregated.totalTools) {
      spinner.succeed(`Static analysis completed - ${messages.join(' | ')}`);
    } else if (aggregated.successCount > 0) {
      spinner.warn(`Static analysis partially completed - ${messages.join(' | ')}`);
    } else {
      spinner.fail(`Static analysis failed`);
    }

    // Display individual errors if any
    if (aggregated.errors.length > 0) {
      aggregated.errors.forEach(error => {
        this.cli.displayWarning(error);
      });
    }
  }
}
