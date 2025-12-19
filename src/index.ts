#!/usr/bin/env node

import { InteractiveCLI } from './cli';
import { AuditOrchestrator } from './orchestrator';
import { LLMAuditor } from './auditor';

async function main() {
  const cli = new InteractiveCLI();

  try {
    cli.displayWelcome();

    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      cli.displayWarning(
        'No AI API key found. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.'
      );
      cli.displayInfo('For Anthropic: export ANTHROPIC_API_KEY=your_api_key');
      cli.displayInfo('For OpenAI: export OPENAI_API_KEY=your_api_key');
      process.exit(1);
    }

    const auditor = new LLMAuditor();
    cli.displayInfo(`Using AI: ${auditor.getProviderName()}\n`);

    const config = await cli.getAuditConfig();
    const orchestrator = new AuditOrchestrator();

    console.log('\n');
    cli.displayInfo('Starting audit with the following configuration:');
    cli.displayInfo(`  Source Type: ${config.sourceType}`);
    cli.displayInfo(`  Source Path: ${config.sourcePath}`);
    if (config.targetFile) {
      cli.displayInfo(`  Target File: ${config.targetFile}`);
    }
    cli.displayInfo(`  Vulnerability Checks: ${config.vulnerabilityChecks.length} selected`);
    console.log('\n');

    await orchestrator.runAudit(config);

    cli.displaySuccess('\nAudit completed successfully!');
    process.exit(0);
  } catch (error: any) {
    cli.displayError(error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
