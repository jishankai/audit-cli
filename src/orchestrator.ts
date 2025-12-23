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

  private normalizeForSimilarity(text: string): string {
    return (text || '')
      .toLowerCase()
      // Strip Solidity filenames and common file prefixes (e.g. "Token.sol:" or "contracts/Token.sol")
      .replace(/\b[\w./-]+\.sol\b:?/g, ' ')
      // Strip line/column-ish tokens (e.g. ":123" or ":123:45")
      .replace(/:\d+(?::\d+)?/g, ' ')
      // Collapse punctuation
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toKeywordSet(text: string): Set<string> {
    const normalized = this.normalizeForSimilarity(text);
    return new Set(normalized.split(' ').filter(w => w.length > 3));
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    if (a.size === 0 || b.size === 0) return 0;

    const intersectionSize = [...a].filter(x => b.has(x)).length;
    const unionSize = new Set([...a, ...b]).size;
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
  }

  private severityRank(severity: VulnerabilityFinding['severity']): number {
    const ranks: Record<VulnerabilityFinding['severity'], number> = {
      Critical: 5,
      High: 4,
      Medium: 3,
      Low: 2,
      Info: 1
    };
    return ranks[severity] ?? 0;
  }

  private worstSeverity(severities: VulnerabilityFinding['severity'][]): VulnerabilityFinding['severity'] {
    return severities.reduce((worst, current) =>
      this.severityRank(current) > this.severityRank(worst) ? current : worst
    , severities[0]);
  }

  /**
   * Checks if two findings are similar enough to merge.
   *
   * Requirement (per user): ONLY merge within the same VulnerabilityType.
   *
   * We also normalize titles to remove file names / line numbers, since the same issue
   * appearing across multiple files often gets slightly different titles.
   */
  private areSimilarFindings(a: VulnerabilityFinding, b: VulnerabilityFinding): boolean {
    // Only allow merges within same vulnerability type.
    if (a.type !== b.type) {
      return false;
    }

    const titleSimilarity = this.jaccardSimilarity(this.toKeywordSet(a.title), this.toKeywordSet(b.title));

    // Title similarity is the primary signal.
    if (titleSimilarity >= 0.65) {
      return true;
    }

    // Fallback: if both have very short titles, compare recommendations as well.
    const titleWordsA = this.toKeywordSet(a.title);
    const titleWordsB = this.toKeywordSet(b.title);
    if (titleWordsA.size <= 4 && titleWordsB.size <= 4) {
      const recSimilarity = this.jaccardSimilarity(this.toKeywordSet(a.recommendation), this.toKeywordSet(b.recommendation));
      return recSimilarity >= 0.6;
    }

    return false;
  }

  /**
   * Merges multiple similar findings into one.
   * - Aggregates locations/files
   * - Takes the worst severity across occurrences
   * - Keeps a representative title (most common; tie-breaker: shorter)
   */
  private mergeSimilarFindings(findings: VulnerabilityFinding[]): VulnerabilityFinding {
    const base = findings[0];

    const allLocations: string[] = [];
    const allFiles = new Set<string>();
    const severities = findings.map(f => f.severity);

    // Pick the most common title to reduce file-specific wording.
    const titleCounts = new Map<string, number>();
    const recommendationCounts = new Map<string, number>();

    let mergedEvidence: string | undefined = base.evidence;

    findings.forEach(f => {
      allLocations.push(f.location);
      if (f.affectedFiles) {
        f.affectedFiles.forEach(file => allFiles.add(file));
      }

      titleCounts.set(f.title, (titleCounts.get(f.title) ?? 0) + 1);

      const rec = (f.recommendation || '').trim();
      if (rec) {
        recommendationCounts.set(rec, (recommendationCounts.get(rec) ?? 0) + 1);
      }

      if (!mergedEvidence && f.evidence) {
        mergedEvidence = f.evidence;
      }
    });

    const bestTitle = [...titleCounts.entries()]
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].length - b[0].length;
      })[0]?.[0] ?? base.title;

    const bestRecommendation = [...recommendationCounts.entries()]
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].length - b[0].length;
      })[0]?.[0] ?? base.recommendation;

    const mergedSeverity = this.worstSeverity(severities);

    let mergedDescription = base.description;
    if (findings.length > 1) {
      mergedDescription = `${base.description}\n\n**Note:** This issue was found in ${findings.length} location(s) across ${allFiles.size || 1} file(s).`;

      if (new Set(severities).size > 1) {
        mergedDescription += `\n\n**Note:** Severity varied across occurrences; this entry uses the worst-case severity (${mergedSeverity}).`;
      }
    }

    return {
      ...base,
      title: bestTitle,
      severity: mergedSeverity,
      recommendation: bestRecommendation,
      evidence: mergedEvidence,
      locations: allLocations,
      affectedFiles: Array.from(allFiles),
      occurrences: findings.length,
      description: mergedDescription
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
