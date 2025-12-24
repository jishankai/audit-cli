import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import boxen from 'boxen';
import figlet from 'figlet';
import gradient from 'gradient-string';
import Table from 'cli-table3';
import { SourceType, VulnerabilityType, AuditConfig, ReportFormat } from './types';
import inquirerFuzzyPath from 'inquirer-fuzzy-path';

// Register fuzzy path plugin for path autocomplete
inquirer.registerPrompt('fuzzypath', inquirerFuzzyPath);

export class InteractiveCLI {
  async getAuditConfig(): Promise<AuditConfig> {
    // Display welcome banner first
    this.displayWelcome();

    const sourceTypeAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'sourceType',
        message: 'Select source type:',
        choices: [
          { name: 'GitHub Repository', value: SourceType.GITHUB },
          { name: 'Local Directory/File', value: SourceType.LOCAL }
        ]
      }
    ]);

    let sourcePathAnswer;
    let targetFile: string | undefined;

    if (sourceTypeAnswer.sourceType === SourceType.GITHUB) {
      // GitHub URL: use regular input
      sourcePathAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'sourcePath',
          message: 'Enter GitHub repository URL (e.g., https://github.com/user/repo):',
          validate: (input: string) => {
            if (!input || input.trim() === '') {
              return 'URL cannot be empty';
            }
            if (!input.includes('github.com')) {
              return 'Please enter a valid GitHub repository URL';
            }
            return true;
          }
        }
      ]);

      // For GitHub, optionally select a specific file
      const targetFileAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'hasTargetFile',
          message: 'Do you want to audit a specific file (or entire project)?',
          default: false
        }
      ]);

      if (targetFileAnswer.hasTargetFile) {
        const fileAnswer = await inquirer.prompt([
          {
            type: 'input',
            name: 'targetFile',
            message: 'Enter the relative path to the Solidity file (e.g., contracts/Token.sol):',
            validate: (input: string) => {
              if (!input.endsWith('.sol')) {
                return 'File must be a .sol file';
              }
              return true;
            }
          }
        ]);
        targetFile = fileAnswer.targetFile;
      }
    } else {
      // Local path: unified prompt that supports both browsing and direct input
      const pathAnswer = await inquirer.prompt([
        {
          type: 'fuzzypath',
          name: 'sourcePath',
          message: 'Select or enter path to directory or .sol file (type to search, or paste absolute path):',
          excludePath: (nodePath: string) => nodePath.includes('node_modules'),
          excludeFilter: (nodePath: string) => nodePath.startsWith('.'),
          itemType: 'any',
          rootPath: process.cwd(),
          suggestOnly: true,
          depthLimit: 10,
          validate: async (input: string) => {
            if (!input || input.trim() === '') {
              return 'Path cannot be empty';
            }
            const resolvedPath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
            const fs = await import('fs-extra');
            if (!(await fs.pathExists(resolvedPath))) {
              return `Path does not exist: ${resolvedPath}`;
            }
            return true;
          }
        }
      ]);

      const resolvedPath = path.isAbsolute(pathAnswer.sourcePath)
        ? pathAnswer.sourcePath
        : path.resolve(process.cwd(), pathAnswer.sourcePath);

      sourcePathAnswer = { sourcePath: resolvedPath };
      // For local, targetFile remains undefined as sourcePath can be either file or directory
    }

    // Automatically check all vulnerability types
    const vulnerabilityChecks = Object.values(VulnerabilityType);

    // Report format selection
    const reportFormatsAnswer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'reportFormats',
        message: 'Select report formats (Space to select, Enter to confirm):',
        choices: [
          { name: 'PDF (.pdf)', value: ReportFormat.PDF, checked: true },
          { name: 'Markdown (.md)', value: ReportFormat.MARKDOWN, checked: false },
          { name: 'JSON (.json)', value: ReportFormat.JSON, checked: false }
        ],
        validate: (input: ReportFormat[]) => {
          if (input.length === 0) {
            return 'Please select at least one report format';
          }
          return true;
        }
      }
    ]);

    // Use default reports directory
    const outputPath = './reports';

    return {
      sourceType: sourceTypeAnswer.sourceType,
      sourcePath: sourcePathAnswer.sourcePath,
      targetFile,
      vulnerabilityChecks,
      outputPath,
      reportFormats: reportFormatsAnswer.reportFormats
    };
  }

  displayWelcome(): void {
    console.clear();
    
    // Create ASCII art title
    const title = figlet.textSync('Audit CLI', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    });
    
    // Apply gradient to title
    console.log('\n' + gradient.pastel.multiline(title));
    
    // Create info box
    const infoBox = boxen(
      chalk.white.bold('Smart Contract Security Audit Tool\n\n') +
      chalk.gray('🔍 Multi-Tool Static Analysis: ') + chalk.cyan('Slither + Mythril\n') +
      chalk.gray('😊 AI-Powered Analysis: ') + chalk.cyan('GPT / Claude\n') +
      chalk.gray('📊 42 Vulnerability Types\n') +
      chalk.gray('📝 Multiple Report Formats'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        backgroundColor: '#1a1a2e'
      }
    );
    
    console.log(infoBox);
    console.log(chalk.gray('─'.repeat(70)) + '\n');
  }

  displayError(message: string): void {
    console.error(chalk.red.bold('\nError: ') + chalk.red(message));
  }

  displaySuccess(message: string): void {
    console.log(chalk.green.bold('\n✓ ') + chalk.green(message));
  }

  displayWarning(message: string): void {
    console.log(chalk.yellow.bold('\n⚠ ') + chalk.yellow(message));
  }

  displayInfo(message: string): void {
    console.log(chalk.blue('ℹ ') + message);
  }

  displayConfigSummary(config: AuditConfig): void {
    console.log('\n' + chalk.cyan.bold('📋 Audit Configuration Summary'));
    console.log(chalk.gray('─'.repeat(70)));
    
    const table = new Table({
      style: { 
        head: ['cyan', 'bold'],
        border: ['gray']
      },
      colWidths: [25, 45],
      wordWrap: true
    });

    table.push(
      [chalk.cyan('Source Type'), config.sourceType === SourceType.GITHUB ? '🌐 GitHub Repository' : '📁 Local Directory/File'],
      [chalk.cyan('Source Path'), chalk.white(config.sourcePath)],
      [chalk.cyan('Target File'), config.targetFile ? chalk.white(config.targetFile) : chalk.gray('All .sol files')],
      [chalk.cyan('Vulnerability Checks'), chalk.green(`${config.vulnerabilityChecks.length} types`)],
      [chalk.cyan('Report Formats'), config.reportFormats?.map(f => {
        const icons: Record<string, string> = {
          'pdf': '📄',
          'markdown': '📝',
          'json': '📊'
        };
        return icons[f] || '📄';
      }).join(' ') || '📝 📊'],
      [chalk.cyan('Output Directory'), chalk.white(config.outputPath || './reports')]
    );

    console.log(table.toString());
    console.log(chalk.gray('─'.repeat(70)) + '\n');
  }

  displayAuditSummary(report: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    infoIssues: number;
  }): void {
    console.log('\n' + chalk.cyan.bold('🎯 Audit Results Summary'));
    console.log(chalk.gray('─'.repeat(70)));
    
    const table = new Table({
      head: [
        chalk.white.bold('Severity'),
        chalk.white.bold('Count'),
        chalk.white.bold('Visual')
      ],
      colWidths: [15, 10, 45],
      style: { 
        head: ['cyan', 'bold'],
        border: ['gray']
      }
    });

    const createBar = (count: number, max: number, color: string) => {
      const barLength = Math.min(Math.ceil((count / Math.max(max, 1)) * 30), 30);
      const colorFn = (chalk as any)[color];
      return colorFn('█'.repeat(barLength)) + chalk.gray('░'.repeat(30 - barLength));
    };

    const maxCount = Math.max(
      report.criticalIssues,
      report.highIssues,
      report.mediumIssues,
      report.lowIssues,
      report.infoIssues,
      1
    );

    table.push(
      [
        chalk.red.bold('🔴 Critical'),
        chalk.red.bold(report.criticalIssues.toString()),
        createBar(report.criticalIssues, maxCount, 'red')
      ],
      [
        chalk.magenta.bold('🟣 High'),
        chalk.magenta.bold(report.highIssues.toString()),
        createBar(report.highIssues, maxCount, 'magenta')
      ],
      [
        chalk.yellow.bold('🟡 Medium'),
        chalk.yellow.bold(report.mediumIssues.toString()),
        createBar(report.mediumIssues, maxCount, 'yellow')
      ],
      [
        chalk.blue.bold('🔵 Low'),
        chalk.blue.bold(report.lowIssues.toString()),
        createBar(report.lowIssues, maxCount, 'blue')
      ],
      [
        chalk.gray.bold('⚪ Info'),
        chalk.gray.bold(report.infoIssues.toString()),
        createBar(report.infoIssues, maxCount, 'gray')
      ]
    );

    console.log(table.toString());
    
    // Overall status
    const totalIssues = report.totalIssues;
    let statusMessage = '';
    let statusColor = 'green';
    
    if (report.criticalIssues > 0 || report.highIssues > 0) {
      statusMessage = '⚠️  ATTENTION REQUIRED - Critical or High severity issues found!';
      statusColor = 'red';
    } else if (report.mediumIssues > 0) {
      statusMessage = '⚡ Review Recommended - Medium severity issues found';
      statusColor = 'yellow';
    } else if (totalIssues === 0) {
      statusMessage = '✅ No issues detected - Contract appears secure';
      statusColor = 'green';
    } else {
      statusMessage = 'ℹ️  Minor issues found - Review informational findings';
      statusColor = 'blue';
    }
    
    const statusBox = boxen(
      (chalk as any)[statusColor].bold(statusMessage),
      {
        padding: 0.5,
        margin: { top: 1, bottom: 0, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: statusColor as any
      }
    );
    
    console.log(statusBox);
    console.log(chalk.gray('─'.repeat(70)) + '\n');
  }
}
