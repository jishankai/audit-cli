import inquirer from 'inquirer';
import chalk from 'chalk';
import { SourceType, VulnerabilityType, AuditConfig } from './types';

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

    const sourcePathAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'sourcePath',
        message:
          sourceTypeAnswer.sourceType === SourceType.GITHUB
            ? 'Enter GitHub repository URL:'
            : 'Enter local path:',
        validate: (input: string) => {
          if (!input || input.trim() === '') {
            return 'Path cannot be empty';
          }
          return true;
        }
      }
    ]);

    const targetFileAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasTargetFile',
        message: 'Do you want to audit a specific file (or entire project)?',
        default: false
      }
    ]);

    let targetFile: string | undefined;
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
          type: 'input',
          name: 'outputPath',
          message: 'Enter output directory path:',
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
