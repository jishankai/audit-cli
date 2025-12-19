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

    const vulnerabilityAnswer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'vulnerabilityChecks',
        message: 'Select vulnerability types to check (use space to select):',
        choices: [
          { name: '1. Re-Entrancy', value: VulnerabilityType.RE_ENTRANCY, checked: true },
          {
            name: '2. Arithmetic Overflow and Underflow',
            value: VulnerabilityType.ARITHMETIC_OVERFLOW,
            checked: true
          },
          { name: '3. Self Destruct', value: VulnerabilityType.SELF_DESTRUCT, checked: true },
          {
            name: '4. Accessing Private Data',
            value: VulnerabilityType.ACCESSING_PRIVATE_DATA,
            checked: false
          },
          { name: '5. Delegatecall', value: VulnerabilityType.DELEGATECALL, checked: true },
          {
            name: '6. Source of Randomness',
            value: VulnerabilityType.SOURCE_OF_RANDOMNESS,
            checked: true
          },
          {
            name: '7. Denial of Service',
            value: VulnerabilityType.DENIAL_OF_SERVICE,
            checked: true
          },
          {
            name: '8. Phishing with tx.origin',
            value: VulnerabilityType.PHISHING_TX_ORIGIN,
            checked: true
          },
          {
            name: '9. Hiding Malicious Code with External Contract',
            value: VulnerabilityType.HIDING_MALICIOUS_CODE,
            checked: false
          },
          { name: '10. Honeypot', value: VulnerabilityType.HONEYPOT, checked: false },
          { name: '11. Front Running', value: VulnerabilityType.FRONT_RUNNING, checked: false },
          {
            name: '12. Block Timestamp Manipulation',
            value: VulnerabilityType.BLOCK_TIMESTAMP_MANIPULATION,
            checked: true
          },
          {
            name: '13. Signature Replay',
            value: VulnerabilityType.SIGNATURE_REPLAY,
            checked: false
          },
          {
            name: '14. Bypass Contract Size Check',
            value: VulnerabilityType.BYPASS_CONTRACT_SIZE_CHECK,
            checked: false
          },
          {
            name: '15. Deploy Different Contracts at Same Address',
            value: VulnerabilityType.DEPLOY_DIFFERENT_CONTRACTS,
            checked: false
          },
          {
            name: '16. Vault Inflation Attack',
            value: VulnerabilityType.VAULT_INFLATION_ATTACK,
            checked: false
          },
          { name: '17. WETH Permit', value: VulnerabilityType.WETH_PERMIT, checked: false },
          { name: '18. 63 / 64 Gas Rule', value: VulnerabilityType.GAS_RULE_63_64, checked: false }
        ],
        validate: (answer: any[]) => {
          if (answer.length < 1) {
            return 'You must select at least one vulnerability type';
          }
          return true;
        }
      }
    ]);

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
      vulnerabilityChecks: vulnerabilityAnswer.vulnerabilityChecks,
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
