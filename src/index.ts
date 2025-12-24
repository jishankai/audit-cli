#!/usr/bin/env node

import { InteractiveCLI } from './cli';
import { AuditOrchestrator } from './orchestrator';
import { LLMAuditor } from './auditor';
import chalk from 'chalk';
import boxen from 'boxen';

async function main() {
  const cli = new InteractiveCLI();

  try {
    // Check for API keys before showing welcome
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      console.clear();
      const errorBox = boxen(
        chalk.red.bold('⚠️  API Key Missing\n\n') +
        chalk.white('No AI API key found. Please set one of:\n\n') +
        chalk.gray('• Anthropic: ') + chalk.cyan('export ANTHROPIC_API_KEY=your_key\n') +
        chalk.gray('• OpenAI:    ') + chalk.cyan('export OPENAI_API_KEY=your_key'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'red'
        }
      );
      console.log(errorBox);
      process.exit(1);
    }

    // Get AI provider info
    const auditor = new LLMAuditor();
    const aiProvider = auditor.getProviderName();

    // Get configuration from user (displayWelcome is called inside)
    const config = await cli.getAuditConfig();

    // Show AI provider being used
    console.log(chalk.blue('ℹ') + chalk.gray(` Using AI Provider: ${chalk.cyan.bold(aiProvider)}\n`));

    // Run the audit
    const orchestrator = new AuditOrchestrator();
    await orchestrator.runAudit(config);

    // Success message with next steps
    const successBox = boxen(
      chalk.green.bold('✅ Audit Completed Successfully!\n\n') +
      chalk.white('Next Steps:\n') +
      chalk.gray('  1. Review the generated report(s) in the ') + chalk.cyan('./reports/') + chalk.gray(' directory\n') +
      chalk.gray('  2. Address Critical and High severity findings first\n') +
      chalk.gray('  3. Validate findings with manual code review\n') +
      chalk.gray('  4. Consider additional security measures as recommended'),
      {
        padding: 1,
        margin: { top: 0, bottom: 1, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'green'
      }
    );
    console.log(successBox);

    process.exit(0);
  } catch (error: any) {
    console.log(); // Add spacing
    cli.displayError(error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

main();
