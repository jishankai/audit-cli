import inquirer from 'inquirer';
import chalk from 'chalk';
import { SourceType, VulnerabilityType, AuditConfig } from './types';
import inquirerFuzzyPath from 'inquirer-fuzzy-path';

// Register fuzzy path plugin for path autocomplete
inquirer.registerPrompt('fuzzypath', inquirerFuzzyPath);

export class InteractiveCLI {
  async getAuditConfig(): Promise<AuditConfig> {
    console.log(chalk.cyan.bold('\n=== Smart Contract Audit CLI ===\n'));

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
          message: 'Enter GitHub repository URL:',
          validate: (input: string) => {
            if (!input || input.trim() === '') {
              return 'URL cannot be empty';
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
            message: 'Enter the relative path to the Solidity file:',
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
      // Local path: use fuzzy path autocomplete for both directories and files
      sourcePathAnswer = await inquirer.prompt([
        {
          type: 'fuzzypath',
          name: 'sourcePath',
          message: 'Select directory or .sol file to audit (type to search):',
          excludePath: (nodePath: string) => nodePath.includes('node_modules'),
          excludeFilter: (nodePath: string) => nodePath.startsWith('.'),
          itemType: 'any',
          rootPath: process.cwd(),
          suggestOnly: false,
          depthLimit: 10
        }
      ]);
      // For local, targetFile remains undefined as sourcePath can be either file or directory
    }

    // Automatically check all vulnerability types
    const vulnerabilityChecks = Object.values(VulnerabilityType);

    const outputAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'customOutput',
        message: 'Do you want to specify a custom output directory?',
        default: false
      }
    ]);

    let outputPath: string | undefined;
    if (outputAnswer.customOutput) {
      const pathAnswer = await inquirer.prompt([
        {
          type: 'fuzzypath',
          name: 'outputPath',
          message: 'Select output directory (type to search, use arrow keys):',
          excludePath: (nodePath: string) => nodePath.includes('node_modules'),
          excludeFilter: (nodePath: string) => nodePath.startsWith('.'),
          itemType: 'directory',
          rootPath: process.cwd(),
          suggestOnly: true,
          depthLimit: 5,
          default: './reports'
        }
      ]);
      outputPath = pathAnswer.outputPath;
    }

    return {
      sourceType: sourceTypeAnswer.sourceType,
      sourcePath: sourcePathAnswer.sourcePath,
      targetFile,
      vulnerabilityChecks,
      outputPath
    };
  }

  displayWelcome(): void {
    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan.bold('  Smart Contract Security Audit Tool'));
    console.log(chalk.cyan('  Powered by Slither + AI Analysis'));
    console.log(chalk.cyan('='.repeat(60) + '\n'));
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
}
