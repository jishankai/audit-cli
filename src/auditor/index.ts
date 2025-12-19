import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { VulnerabilityType, VulnerabilityFinding, SlitherResult } from '../types';
import fs from 'fs-extra';

type AIProvider = 'anthropic' | 'openai';

export class LLMAuditor {
  private provider: AIProvider;
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;
  private model: string;

  constructor() {
    // Check which provider is specified or default to OpenAI
    const aiProvider = process.env.AI_PROVIDER?.toLowerCase();
    const hasAnthropicKey = process.env.ANTHROPIC_API_KEY;
    const hasOpenAIKey = process.env.OPENAI_API_KEY;

    if (aiProvider === 'anthropic' && hasAnthropicKey) {
      this.provider = 'anthropic';
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!
      });
      this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    } else if ((aiProvider === 'openai' || !aiProvider) && hasOpenAIKey) {
      this.provider = 'openai';
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!
      });
      this.model = process.env.OPENAI_MODEL || 'gpt-4.1';
    } else if (hasAnthropicKey) {
      // Fallback to Anthropic if OpenAI preferred but no key
      this.provider = 'anthropic';
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!
      });
      this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    } else if (hasOpenAIKey) {
      // Fallback to OpenAI if Anthropic preferred but no key
      this.provider = 'openai';
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!
      });
      this.model = process.env.OPENAI_MODEL || 'gpt-4.1';
    } else {
      throw new Error('No API key found. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY');
    }
  }

  getProviderName(): string {
    const providerName = this.provider === 'anthropic' ? 'Claude (Anthropic)' : 'GPT (OpenAI)';
    return `${providerName} - Model: ${this.model}`;
  }

  async auditContract(
    contractCode: string,
    slitherResult: SlitherResult,
    vulnerabilityTypes: VulnerabilityType[]
  ): Promise<VulnerabilityFinding[]> {
    const findings: VulnerabilityFinding[] = [];

    const prompt = this.buildAuditPrompt(contractCode, slitherResult, vulnerabilityTypes);

    try {
      const analysisText = await this.callAI(prompt, 16000);
      const parsedFindings = this.parseAuditResponse(analysisText, vulnerabilityTypes);

      findings.push(...parsedFindings);
    } catch (error: any) {
      console.error(`Error calling ${this.provider} API:`, error.message);
    }

    return findings;
  }

  async generateProjectSummary(
    findings: VulnerabilityFinding[],
    slitherResult: SlitherResult
  ): Promise<string> {
    const findingsSummary = findings.map(f => 
      `- [${f.severity}] ${f.type}: ${f.title} (${f.location})`
    ).join('\n');

    const prompt = `Provide a comprehensive executive summary for a smart contract audit project.

FINDINGS SUMMARY:
${findingsSummary || 'No major vulnerabilities found.'}

SLITHER ANALYSIS SUMMARY:
${JSON.stringify(slitherResult.detectors.length > 0 ? slitherResult.detectors.map(d => ({ check: d.check, impact: d.impact })) : 'No issues found', null, 2)}

Provide:
1. Executive Summary of Security Posture
2. High-Level Risk Assessment
3. Key systemic issues observed (if any)
4. Strategic Recommendations for the project
5. Conclusion`;

    try {
      return await this.callAI(prompt, 4000);
    } catch (error: any) {
      return `Error generating project summary: ${error.message}`;
    }
  }

  private async callAI(prompt: string, maxTokens: number): Promise<string> {
    if (this.provider === 'anthropic' && this.anthropicClient) {
      const response = await this.anthropicClient.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } else if (this.provider === 'openai' && this.openaiClient) {
      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: 'You are a smart contract security auditor with expertise in Solidity and blockchain security.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });

      return response.choices[0]?.message?.content || '';
    }

    throw new Error('No valid AI client configured');
  }

  private buildAuditPrompt(
    contractCode: string,
    slitherResult: SlitherResult,
    vulnerabilityTypes: VulnerabilityType[]
  ): string {
    return `You are a smart contract security auditor. Analyze the following Solidity contract for security vulnerabilities.

CONTRACT CODE:
\`\`\`solidity
${contractCode}
\`\`\`

SLITHER ANALYSIS RESULTS:
${JSON.stringify(slitherResult.detectors, null, 2)}

SLITHER IR/SUMMARY:
${slitherResult.irCode || 'Not available'}

VULNERABILITY TYPES TO CHECK:
${vulnerabilityTypes.map((v, i) => `${i + 1}. ${v}`).join('\n')}

Please analyze the contract for these specific vulnerability types. For each finding, provide:
1. Vulnerability Type (from the list above)
2. Severity (Critical/High/Medium/Low/Info)
3. Title (brief description)
4. Description (detailed explanation)
5. Location (line numbers or function names)
6. Recommendation (how to fix)
7. Evidence (code snippet if applicable)

Format your response as a JSON array of findings:
\`\`\`json
[
  {
    "type": "Re-Entrancy",
    "severity": "High",
    "title": "Potential reentrancy vulnerability in withdraw function",
    "description": "The withdraw function makes an external call before updating the balance...",
    "location": "Line 45-52, withdraw() function",
    "recommendation": "Follow the checks-effects-interactions pattern. Update the balance before making the external call.",
    "evidence": "Code snippet showing the vulnerable pattern"
  }
]
\`\`\`

Be thorough and specific. If no vulnerabilities are found for a type, don't include it in the results.`;
  }

  private parseAuditResponse(
    response: string,
    vulnerabilityTypes: VulnerabilityType[]
  ): VulnerabilityFinding[] {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return Array.isArray(parsed) ? parsed : [];
      }

      const directParse = JSON.parse(response);
      return Array.isArray(directParse) ? directParse : [];
    } catch (error) {
      console.warn('Failed to parse LLM response as JSON, attempting text parsing');
      return this.parseTextResponse(response, vulnerabilityTypes);
    }
  }

  private parseTextResponse(
    response: string,
    vulnerabilityTypes: VulnerabilityType[]
  ): VulnerabilityFinding[] {
    const findings: VulnerabilityFinding[] = [];

    const sections = response.split(/(?=\d+\.|\*\*|##)/);

    for (const section of sections) {
      for (const vulnType of vulnerabilityTypes) {
        if (section.toLowerCase().includes(vulnType.toLowerCase())) {
          const severityMatch = section.match(/(Critical|High|Medium|Low|Info)/i);
          const severity = (severityMatch?.[1] || 'Info') as VulnerabilityFinding['severity'];

          findings.push({
            type: vulnType,
            severity,
            title: `Potential ${vulnType} issue detected`,
            description: section.substring(0, 500),
            location: 'See analysis',
            recommendation: 'Review the code carefully and apply security best practices.',
            evidence: section.substring(0, 200)
          });
          break;
        }
      }
    }

    return findings;
  }

  async performComprehensiveAnalysis(
    contractPath: string,
    slitherResult: SlitherResult
  ): Promise<string> {
    const contractCode = await fs.readFile(contractPath, 'utf-8');

    const prompt = `Provide a comprehensive security analysis of this Solidity smart contract:

CONTRACT CODE:
\`\`\`solidity
${contractCode}
\`\`\`

SLITHER ANALYSIS:
${JSON.stringify(slitherResult, null, 2)}

Provide:
1. Overall security assessment
2. Code quality review
3. Best practices evaluation
4. Recommendations for improvement
5. Summary of key concerns`;

    try {
      return await this.callAI(prompt, 8000);
    } catch (error: any) {
      return `Error performing comprehensive analysis: ${error.message}`;
    }
  }
}
