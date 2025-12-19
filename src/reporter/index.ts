import fs from 'fs-extra';
import path from 'path';
import { AuditReport, VulnerabilityFinding } from '../types';

export class ReportGenerator {
  async generateReport(report: AuditReport, outputPath?: string): Promise<string> {
    const markdown = this.generateMarkdown(report);
    const json = JSON.stringify(report, null, 2);

    const defaultPath = outputPath || path.join(process.cwd(), 'reports');
    await fs.ensureDir(defaultPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const markdownFile = path.join(defaultPath, `audit-report-${timestamp}.md`);
    const jsonFile = path.join(defaultPath, `audit-report-${timestamp}.json`);

    await fs.writeFile(markdownFile, markdown);
    await fs.writeFile(jsonFile, json);

    return markdownFile;
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

    sections.push('## Slither Analysis Details');
    sections.push('');
    if (report.slitherAnalysis.detectors && report.slitherAnalysis.detectors.length > 0) {
      sections.push('### Detected Issues');
      sections.push('');
      report.slitherAnalysis.detectors.forEach((detector, index) => {
        sections.push(`#### ${index + 1}. ${detector.check}`);
        sections.push(`- **Impact:** ${detector.impact}`);
        sections.push(`- **Confidence:** ${detector.confidence}`);
        sections.push(`- **Description:** ${detector.description}`);
        sections.push('');
      });
    } else {
      sections.push('No issues detected by Slither automated analysis.');
      sections.push('');
    }

    sections.push('## AI Analysis Summary');
    sections.push('');
    sections.push(report.llmAnalysis || 'Analysis pending or unavailable.');
    sections.push('');

    sections.push('## Recommendations');
    sections.push('');
    sections.push('1. Address all Critical and High severity issues immediately');
    sections.push('2. Review and fix Medium severity issues before deployment');
    sections.push('3. Consider Low severity issues as best practice improvements');
    sections.push('4. Implement comprehensive testing for all fixes');
    sections.push('5. Consider a follow-up audit after remediations');
    sections.push('');

    sections.push('---');
    sections.push('');
    sections.push('*This report was generated using audit-cli with Slither and AI analysis*');

    return sections.join('\n');
  }

  private formatFinding(finding: VulnerabilityFinding, number: number): string {
    const lines: string[] = [];

    lines.push(`### ${number}. ${finding.title}`);
    lines.push('');
    lines.push(`**Type:** ${finding.type}`);
    lines.push(`**Severity:** ${finding.severity}`);
    lines.push(`**Location:** ${finding.location}`);
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
