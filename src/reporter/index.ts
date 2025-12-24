import fs from 'fs-extra';
import path from 'path';
import { AuditReport, VulnerabilityFinding, ReportFormat } from '../types';
import { PDFGenerator } from './pdf-generator';

export class ReportGenerator {
  private pdfGenerator = new PDFGenerator();

  async generateReport(report: AuditReport, outputPath?: string, formats?: ReportFormat[]): Promise<string[]> {
    const defaultPath = outputPath || path.join(process.cwd(), 'reports');
    await fs.ensureDir(defaultPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const generatedFiles: string[] = [];

    // Normalize and dedupe formats; default to markdown and JSON if none provided
    const baseFormats = formats && formats.length > 0
      ? Array.from(new Set(formats))
      : [ReportFormat.MARKDOWN, ReportFormat.JSON];

    const selectedFormats = baseFormats.includes(ReportFormat.ALL)
      ? [ReportFormat.MARKDOWN, ReportFormat.JSON, ReportFormat.PDF]
      : baseFormats;

    const markdownContent = this.generateMarkdown(report);

    // Generate requested formats
    for (const format of selectedFormats) {
      switch (format) {
        case ReportFormat.MARKDOWN:
          generatedFiles.push(await this.generateMarkdownReport(markdownContent, defaultPath, timestamp));
          break;
        case ReportFormat.JSON:
          generatedFiles.push(await this.generateJSONReport(report, defaultPath, timestamp));
          break;
        case ReportFormat.PDF:
          generatedFiles.push(await this.pdfGenerator.generatePDF(markdownContent, defaultPath, timestamp));
          break;
      }
    }

    return generatedFiles;
  }

  private async generateMarkdownReport(markdown: string, defaultPath: string, timestamp: string): Promise<string> {
    const markdownFile = path.join(defaultPath, `audit-report-${timestamp}.md`);
    await fs.writeFile(markdownFile, markdown);
    return markdownFile;
  }

  private async generateJSONReport(report: AuditReport, defaultPath: string, timestamp: string): Promise<string> {
    const json = JSON.stringify(report, null, 2);
    const jsonFile = path.join(defaultPath, `audit-report-${timestamp}.json`);
    await fs.writeFile(jsonFile, json);
    return jsonFile;
  }

  private generateMarkdown(report: AuditReport): string {
    const sections: string[] = [];

    sections.push('# Smart Contract Security Audit Report');
    sections.push('');
    sections.push(`**Project:** ${report.projectName}`);
    sections.push(`**Audit Date:** ${report.auditDate}`);
    sections.push('');

    sections.push('## Executive Summary');
    sections.push('');
    sections.push('| Severity | Count |');
    sections.push('|----------|-------|');
    sections.push(`| Critical | ${report.summary.criticalIssues} |`);
    sections.push(`| High     | ${report.summary.highIssues} |`);
    sections.push(`| Medium   | ${report.summary.mediumIssues} |`);
    sections.push(`| Low      | ${report.summary.lowIssues} |`);
    sections.push(`| Info     | ${report.summary.infoIssues} |`);
    sections.push(`| **Total** | **${report.summary.totalIssues}** |`);
    sections.push('');

    const criticalFindings = report.findings.filter(f => f.severity === 'Critical');
    const highFindings = report.findings.filter(f => f.severity === 'High');
    const mediumFindings = report.findings.filter(f => f.severity === 'Medium');
    const lowFindings = report.findings.filter(f => f.severity === 'Low');
    const infoFindings = report.findings.filter(f => f.severity === 'Info');

    if (criticalFindings.length > 0) {
      sections.push('## Critical Findings');
      sections.push('');
      criticalFindings.forEach((finding, index) => {
        sections.push(this.formatFinding(finding, index + 1));
      });
    }

    if (highFindings.length > 0) {
      sections.push('## High Severity Findings');
      sections.push('');
      highFindings.forEach((finding, index) => {
        sections.push(this.formatFinding(finding, index + 1));
      });
    }

    if (mediumFindings.length > 0) {
      sections.push('## Medium Severity Findings');
      sections.push('');
      mediumFindings.forEach((finding, index) => {
        sections.push(this.formatFinding(finding, index + 1));
      });
    }

    if (lowFindings.length > 0) {
      sections.push('## Low Severity Findings');
      sections.push('');
      lowFindings.forEach((finding, index) => {
        sections.push(this.formatFinding(finding, index + 1));
      });
    }

    if (infoFindings.length > 0) {
      sections.push('## Informational Findings');
      sections.push('');
      infoFindings.forEach((finding, index) => {
        sections.push(this.formatFinding(finding, index + 1));
      });
    }

    sections.push('## Static Analysis Results');
    sections.push('');

    const staticAnalysis = report.staticAnalysis;
    sections.push(`**Tools Run:** ${staticAnalysis.totalTools}`);
    sections.push('');
    sections.push(`**Successful:** ${staticAnalysis.successCount}`);
    sections.push('');
    sections.push(`**Total Issues Found:** ${staticAnalysis.allDetectors.length}`);
    sections.push('');

    // Display results by tool
    for (const result of staticAnalysis.results) {
      const toolName = result.tool.charAt(0).toUpperCase() + result.tool.slice(1);

      sections.push(`### ${toolName} Analysis`);
      sections.push('');

      if (!result.success) {
        sections.push(`**Status:** ❌ Failed`);
        sections.push(`**Errors:** ${result.errors.join(', ')}`);
        sections.push('');
        continue;
      }

      sections.push(`**Status:** ✅ Success`);
      sections.push(`**Issues Found:** ${result.detectors.length}`);
      sections.push('');

      if (result.detectors.length > 0) {
        // Group by severity
        const bySeverity = {
          High: result.detectors.filter(d => d.severity === 'High'),
          Medium: result.detectors.filter(d => d.severity === 'Medium'),
          Low: result.detectors.filter(d => d.severity === 'Low'),
          Informational: result.detectors.filter(d => d.severity === 'Informational')
        };

        for (const [severity, detectors] of Object.entries(bySeverity)) {
          if (detectors.length > 0) {
            sections.push(`#### ${severity} Severity (${detectors.length})`);
            sections.push('');
            detectors.forEach((d, i) => {
              sections.push(`${i + 1}. **${d.title}** (${d.id})`);
              sections.push(`   - **Location:** ${d.location}`);
              sections.push(`   - **Description:** ${d.description.substring(0, 300)}${d.description.length > 300 ? '...' : ''}`);
              sections.push('');
            });
          }
        }
      } else {
        sections.push('No issues detected.');
        sections.push('');
      }
    }

    sections.push('## AI Analysis Summary');
    sections.push('');
    sections.push(report.llmAnalysis || 'Analysis pending or unavailable.');
    sections.push('');

    sections.push('---');
    sections.push('');
    sections.push('*This report was generated using audit-cli with multi-tool static analysis (Slither & Mythril) and AI-powered analysis*');

    return sections.join('\n');
  }

  private formatFinding(finding: VulnerabilityFinding, number: number): string {
    const lines: string[] = [];

    lines.push(`### ${number}. ${finding.title}`);
    lines.push('');
    lines.push(`**Type:** ${finding.type}`);
    lines.push('');
    lines.push(`**Severity:** ${finding.severity}`);
    lines.push('');

    // Show affected files if available
    if (finding.affectedFiles && finding.affectedFiles.length > 0) {
      const fileList = finding.affectedFiles.join(', ');
      lines.push(`**Affected File(s):** ${fileList}`);
      lines.push('');
    }

    // Show occurrences if this is a merged finding
    if (finding.occurrences && finding.occurrences > 1) {
      lines.push(`**Occurrences:** ${finding.occurrences}`);
    }

    lines.push('');

    // Show all locations if there are multiple
    if (finding.locations && finding.locations.length > 1) {
      lines.push('**Locations:**');
      finding.locations.forEach((loc, idx) => {
        lines.push(`${idx + 1}. ${loc}`);
      });
    } else {
      lines.push(`**Location:** ${finding.location}`);
    }

    lines.push('');
    lines.push('**Description:**');
    lines.push(finding.description);
    lines.push('');
    lines.push('**Recommendation:**');
    lines.push(finding.recommendation);
    lines.push('');

    if (finding.evidence) {
      lines.push('**Evidence:**');
      lines.push('```solidity');
      lines.push(finding.evidence);
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  }

  generateConsoleSummary(report: AuditReport): string {
    const lines: string[] = [];

    lines.push('\n='.repeat(60));
    lines.push('AUDIT SUMMARY');
    lines.push('='.repeat(60));
    lines.push(`Project: ${report.projectName}`);
    lines.push(`Date: ${report.auditDate}`);
    lines.push('');
    lines.push(`Total Issues Found: ${report.summary.totalIssues}`);
    lines.push(`  - Critical: ${report.summary.criticalIssues}`);
    lines.push(`  - High: ${report.summary.highIssues}`);
    lines.push(`  - Medium: ${report.summary.mediumIssues}`);
    lines.push(`  - Low: ${report.summary.lowIssues}`);
    lines.push(`  - Info: ${report.summary.infoIssues}`);
    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}
