import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { AuditConfig, AuditReport, VulnerabilityFinding } from './types';
import { SourceFetcher } from './fetcher';
import { SlitherAnalyzer } from './slither';
import { LLMAuditor } from './auditor';
import { ReportGenerator } from './reporter';
import { InteractiveCLI } from './cli';

export class AuditOrchestrator {
  private fetcher: SourceFetcher;
  private slitherAnalyzer: SlitherAnalyzer;
  private llmAuditor: LLMAuditor;
  private reportGenerator: ReportGenerator;
  private cli: InteractiveCLI;

  constructor() {
    this.fetcher = new SourceFetcher();
    this.slitherAnalyzer = new SlitherAnalyzer();
    this.llmAuditor = new LLMAuditor();
    this.reportGenerator = new ReportGenerator();
    this.cli = new InteractiveCLI();
  }

  async runAudit(config: AuditConfig): Promise<void> {
    let spinner = ora();

    try {
      spinner = ora('Fetching source code...').start();
      const targetPath = await this.fetcher.fetch(
        config.sourceType,
        config.sourcePath,
        config.targetFile
      );
      spinner.succeed('Source code fetched successfully');

      const isDirectory = (await fs.stat(targetPath)).isDirectory();
      const solidityFiles = isDirectory
        ? await this.fetcher.listSolidityFiles(targetPath)
        : [targetPath];

      this.cli.displayInfo(`Found ${solidityFiles.length} Solidity file(s) to audit`);

      spinner = ora('Running Slither analysis...').start();
      const slitherResult = await this.slitherAnalyzer.analyze(targetPath);

      if (!slitherResult.success) {
        spinner.warn('Slither analysis completed with warnings');
        if (slitherResult.errors && slitherResult.errors.length > 0) {
          this.cli.displayWarning(`Slither errors: ${slitherResult.errors.join(', ')}`);
        }
      } else {
        spinner.succeed(
          `Slither analysis completed - found ${slitherResult.detectors.length} potential issues`
        );
      }

      const aiProvider = this.llmAuditor.getProviderName();
      spinner = ora(`Performing AI-powered security analysis using ${aiProvider}...`).start();
      const allFindings: VulnerabilityFinding[] = [];

      for (const solidityFile of solidityFiles) {
        const contractCode = await fs.readFile(solidityFile, 'utf-8');
        const findings = await this.llmAuditor.auditContract(
          contractCode,
          slitherResult,
          config.vulnerabilityChecks
        );
        allFindings.push(...findings);
      }

      spinner.succeed(`AI analysis (${aiProvider}) completed - found ${allFindings.length} findings`);

      spinner = ora('Generating comprehensive analysis...').start();
      const comprehensiveAnalysis = solidityFiles.length === 1
        ? await this.llmAuditor.performComprehensiveAnalysis(solidityFiles[0], slitherResult)
        : await this.llmAuditor.generateProjectSummary(allFindings, slitherResult);
      spinner.succeed('Comprehensive analysis completed');

      const report: AuditReport = {
        projectName: path.basename(config.sourcePath),
        auditDate: new Date().toISOString(),
        summary: this.calculateSummary(allFindings),
        findings: allFindings,
        slitherAnalysis: slitherResult,
        llmAnalysis: comprehensiveAnalysis
      };

      spinner = ora('Generating audit report...').start();
      const reportPath = await this.reportGenerator.generateReport(report, config.outputPath);
      spinner.succeed(`Audit report generated: ${reportPath}`);

      console.log(this.reportGenerator.generateConsoleSummary(report));

      if (report.summary.criticalIssues > 0 || report.summary.highIssues > 0) {
        this.cli.displayWarning(
          'Critical or High severity issues found! Review the report immediately.'
        );
      } else {
        this.cli.displaySuccess('No critical or high severity issues found.');
      }
    } catch (error: any) {
      if (spinner) {
        spinner.fail('Audit failed');
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

  private async cleanup(): Promise<void> {
    try {
      await this.fetcher.cleanup();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}
