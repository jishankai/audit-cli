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
    const startTime = Date.now();

    try {
      // Display configuration summary
      this.cli.displayConfigSummary(config);

      console.log(chalk.cyan.bold('🚀 Starting Audit Process'));
      console.log(chalk.gray('─'.repeat(70)) + '\n');

      // Step 1: Fetch source code
      console.log(chalk.cyan.bold('[1/5] Source Code Fetching'));
      spinner = ora({
        text: config.sourceType === 'github' 
          ? chalk.gray(`Cloning repository from ${chalk.white(config.sourcePath)}`)
          : chalk.gray(`Reading local files from ${chalk.white(config.sourcePath)}`),
        spinner: 'dots',
        color: 'cyan'
      }).start();
      
      const targetPath = await this.fetcher.fetch(
        config.sourceType,
        config.sourcePath,
        config.targetFile
      );
      
      const isDirectory = (await fs.stat(targetPath)).isDirectory();
      const solidityFiles = isDirectory
        ? await this.fetcher.listSolidityFiles(targetPath)
        : [targetPath];

      spinner.succeed(chalk.green(`✓ Source code ready - ${chalk.bold(solidityFiles.length)} Solidity file(s) found`));
      
      // Display file list for transparency
      if (solidityFiles.length <= 10) {
        console.log(chalk.gray('  Files to audit:'));
        solidityFiles.forEach(file => {
          console.log(chalk.gray(`    • ${path.basename(file)}`));
        });
      } else {
        console.log(chalk.gray(`  Files to audit: ${solidityFiles.slice(0, 5).map(f => path.basename(f)).join(', ')} and ${solidityFiles.length - 5} more...`));
      }
      console.log();

      // Step 2: Static Analysis
      console.log(chalk.cyan.bold('[2/5] Static Analysis'));
      console.log(chalk.gray(`  Running ${this.analyzers.length} analysis tool(s) on ${solidityFiles.length} file(s)...`));
      
      spinner = ora({
        text: chalk.gray('Initializing analyzers...'),
        spinner: 'dots',
        color: 'cyan'
      }).start();
      
      const aggregatedResult = await this.runAllAnalyzers(targetPath, spinner);
      this.displayAnalyzerResults(aggregatedResult, spinner);
      console.log();

      // Step 3: AI Analysis with progress bar
      console.log(chalk.cyan.bold('[3/5] AI-Powered Vulnerability Detection'));
      const aiProvider = this.llmAuditor.getProviderName();
      console.log(chalk.gray(`  Analyzing ${solidityFiles.length} file(s) with ${aiProvider} for ${config.vulnerabilityChecks.length} vulnerability types...`));
      console.log(chalk.gray('─'.repeat(70)));
      
      const progressBar = new cliProgress.SingleBar({
        format: '  ' + chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} files | {status}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      });

      progressBar.start(solidityFiles.length, 0, { status: 'Preparing analysis...' });
      
      const allFindings: VulnerabilityFinding[] = [];

      for (let i = 0; i < solidityFiles.length; i++) {
        const solidityFile = solidityFiles[i];
        const contractCode = await fs.readFile(solidityFile, 'utf-8');
        const fileName = path.basename(solidityFile);
        
        progressBar.update(i, { 
          status: `Analyzing ${chalk.white(fileName)}...` 
        });
        
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
        
        progressBar.update(i + 1, { 
          status: `Completed ${chalk.white(fileName)} (${findings.length} findings)` 
        });
      }

      progressBar.stop();

      // Merge similar findings
      const mergedFindings = this.mergeFindings(allFindings);
      console.log(chalk.green(`✓ AI analysis completed - ${chalk.bold(allFindings.length)} total findings, ${chalk.bold(mergedFindings.length)} unique issues identified`));
      console.log();

      // Step 4: Comprehensive Analysis
      console.log(chalk.cyan.bold('[4/5] Comprehensive Analysis & Summary'));
      spinner = ora({
        text: chalk.gray(solidityFiles.length === 1 
          ? 'Generating detailed contract analysis...'
          : `Generating project-wide summary (${mergedFindings.length} unique findings)...`),
        spinner: 'dots',
        color: 'cyan'
      }).start();
      
      const comprehensiveAnalysis = solidityFiles.length === 1
        ? await this.llmAuditor.performComprehensiveAnalysis(solidityFiles[0], aggregatedResult)
        : await this.llmAuditor.generateProjectSummary(mergedFindings, aggregatedResult);
      
      spinner.succeed(chalk.green('✓ Comprehensive analysis completed'));
      console.log();

      const report: AuditReport = {
        projectName: path.basename(config.sourcePath),
        auditDate: new Date().toISOString(),
        summary: this.calculateSummary(mergedFindings),
        findings: mergedFindings,
        staticAnalysis: aggregatedResult,
        llmAnalysis: comprehensiveAnalysis
      };

      // Step 5: Generate Reports
      console.log(chalk.cyan.bold('[5/5] Report Generation'));
      const formatNames = config.reportFormats?.map(f => f.toUpperCase()).join(', ') || 'MARKDOWN, JSON';
      spinner = ora({
        text: chalk.gray(`Generating ${formatNames} report(s)...`),
        spinner: 'dots',
        color: 'cyan'
      }).start();
      
      const reportPaths = await this.reportGenerator.generateReport(report, config.outputPath, config.reportFormats);
      const reportFileNames = reportPaths.map(p => path.basename(p));
      
      spinner.succeed(chalk.green(`✓ ${reportPaths.length} report(s) generated successfully`));
      console.log();

      // Calculate elapsed time
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      console.log(chalk.gray('─'.repeat(70)));
      console.log(chalk.cyan.bold('⏱️  Audit completed in ') + chalk.white.bold(timeStr));
      console.log(chalk.gray('─'.repeat(70)) + '\n');

      // Display beautiful summary
      this.cli.displayAuditSummary(report.summary);

      // Display report locations
      console.log(chalk.cyan.bold('📁 Generated Reports:'));
      reportPaths.forEach(rp => {
        const format = path.extname(rp).toUpperCase().slice(1);
        const icon = format === 'PDF' ? '📄' : format === 'JSON' ? '📊' : '📝';
        console.log(chalk.gray(`  ${icon} `) + chalk.white(rp));
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

  private async runAllAnalyzers(targetPath: string, spinner?: Ora): Promise<AggregatedAnalyzerResult> {
    // Run all analyzers with individual progress updates
    const results = await Promise.all(
      this.analyzers.map(async analyzer => {
        const toolName = analyzer.getToolName();
        if (spinner) {
          spinner.text = chalk.gray(`Running ${chalk.white(toolName)} analysis...`);
        }
        
        try {
          const result = await analyzer.analyze(targetPath);
          if (spinner) {
            spinner.text = chalk.gray(`${chalk.white(toolName)} completed - ${result.detectors.length} issues found`);
          }
          return result;
        } catch (error: any) {
          if (spinner) {
            spinner.text = chalk.gray(`${chalk.white(toolName)} failed - continuing with other tools`);
          }
          return {
            tool: toolName.toLowerCase() as any,
            success: false,
            errors: [error.message],
            detectors: [],
            supplementaryData: {}
          };
        }
      })
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
    const totalIssues = aggregated.allDetectors.length;
    
    if (aggregated.successCount === aggregated.totalTools) {
      spinner.succeed(chalk.green(`✓ All ${aggregated.totalTools} analyzer(s) completed - ${chalk.bold(totalIssues)} total issues detected`));
    } else if (aggregated.successCount > 0) {
      spinner.warn(chalk.yellow(`⚠ ${aggregated.successCount}/${aggregated.totalTools} analyzer(s) completed - ${chalk.bold(totalIssues)} issues detected`));
    } else {
      spinner.fail(chalk.red(`✗ All analyzers failed - proceeding with AI-only analysis`));
    }

    // Display individual tool results
    console.log(chalk.gray('  Tool Results:'));
    aggregated.results.forEach(result => {
      const toolName = result.tool.charAt(0).toUpperCase() + result.tool.slice(1);
      if (result.success) {
        const icon = result.detectors.length > 0 ? '⚠️' : '✅';
        console.log(chalk.gray(`    ${icon} ${toolName}: `) + chalk.white(`${result.detectors.length} issue(s)`));
      } else {
        console.log(chalk.gray(`    ❌ ${toolName}: `) + chalk.red('Failed'));
      }
    });

    // Display individual errors if any
    if (aggregated.errors.length > 0) {
      console.log(chalk.gray('  Errors:'));
      aggregated.errors.forEach(error => {
        console.log(chalk.gray('    • ') + chalk.yellow(error));
      });
    }
  }
}
