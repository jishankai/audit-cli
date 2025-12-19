import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { VulnerabilityType, VulnerabilityFinding, SlitherResult, AggregatedAnalyzerResult } from '../types';
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
    analyzerResults: AggregatedAnalyzerResult,
    vulnerabilityTypes: VulnerabilityType[],
    fileName?: string
  ): Promise<VulnerabilityFinding[]> {
    const findings: VulnerabilityFinding[] = [];

    const prompt = this.buildAuditPrompt(contractCode, analyzerResults, vulnerabilityTypes, fileName);

    try {
      const analysisText = await this.callAI(prompt, 16000);
      const parsedFindings = this.parseAuditResponse(analysisText, vulnerabilityTypes);

      // Filter out invalid "no finding" reports
      const validFindings = parsedFindings.filter(finding => this.isValidFinding(finding));
      findings.push(...validFindings);
    } catch (error: any) {
      console.error(`Error calling ${this.provider} API:`, error.message);
    }

    return findings;
  }

  async generateProjectSummary(
    findings: VulnerabilityFinding[],
    analyzerResults: AggregatedAnalyzerResult
  ): Promise<string> {
    const findingsSummary = findings.map(f =>
      `- [${f.severity}] ${f.type}: ${f.title} (${f.location})`
    ).join('\n');

    const toolsSummary = analyzerResults.results.map(result => {
      const toolName = result.tool.charAt(0).toUpperCase() + result.tool.slice(1);
      if (!result.success) {
        return `${toolName}: Failed`;
      }
      return `${toolName}: ${result.detectors.length} issue(s) found`;
    }).join('\n');

    const prompt = `Provide a comprehensive executive summary for a smart contract audit project.

FINDINGS SUMMARY:
${findingsSummary || 'No major vulnerabilities found.'}

STATIC ANALYSIS TOOLS SUMMARY:
${toolsSummary}

TOTAL DETECTIONS FROM ALL TOOLS:
${analyzerResults.allDetectors.length} issue(s)

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
        max_completion_tokens: maxTokens,
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
    analyzerResults: AggregatedAnalyzerResult,
    vulnerabilityTypes: VulnerabilityType[],
    fileName?: string
  ): string {
    // Format detectors by tool
    const detectorsByTool = analyzerResults.results.map(result => {
      const toolName = result.tool.charAt(0).toUpperCase() + result.tool.slice(1);

      if (!result.success) {
        return `${toolName} Analysis: Failed`;
      }

      const detectorList = result.detectors.map(d => ({
        id: d.id,
        severity: d.severity,
        title: d.title,
        description: d.description,
        location: d.location
      }));

      return `${toolName} Analysis:\n${JSON.stringify(detectorList, null, 2)}`;
    }).join('\n\n');

    // Get IR code from Slither if available
    const slitherResult = analyzerResults.results.find(r => r.tool === 'slither');
    const irCode = slitherResult?.supplementaryData?.irCode || 'Not available';

    const fileInfo = fileName ? `\n\nFILE NAME: ${fileName}\n` : '';

    return `You are a smart contract security auditor. Analyze the following Solidity contract for security vulnerabilities.${fileInfo}
CONTRACT CODE:
\`\`\`solidity
${contractCode}
\`\`\`

STATIC ANALYSIS RESULTS FROM MULTIPLE TOOLS:
${detectorsByTool}

SLITHER IR/SUMMARY:
${irCode}

VULNERABILITY TYPES TO CHECK:
${vulnerabilityTypes.map((v, i) => `${i + 1}. ${v}`).join('\n')}

Please analyze the contract for these specific vulnerability types. Consider findings from both Slither and Mythril tools.

CRITICAL INSTRUCTIONS:
- ONLY report vulnerabilities that ACTUALLY EXIST in the code
- DO NOT report informational findings about vulnerabilities that are NOT present
- DO NOT include findings like "No [vulnerability type] detected" or "No action needed"
- If a vulnerability type is not present in the contract, simply omit it from the results
- Focus on REAL security issues that need to be addressed

For each ACTUAL vulnerability found, provide:
1. Vulnerability Type (from the list above)
2. Severity (Critical/High/Medium/Low/Info)
3. Title (brief description)
4. Description (detailed explanation of the ACTUAL issue)
5. Location (MUST include function name and line numbers if available, e.g., "withdraw() function, lines 10-15")
6. Recommendation (actionable fix for the REAL issue)
7. Evidence (actual code snippet showing the vulnerability)

Format your response as a JSON array of findings:
\`\`\`json
[
  {
    "type": "Re-Entrancy",
    "severity": "High",
    "title": "Reentrancy vulnerability in withdraw function",
    "description": "The withdraw function makes an external call before updating the balance, allowing attackers to drain funds...",
    "location": "Line 45-52, withdraw() function",
    "recommendation": "Follow the checks-effects-interactions pattern. Update the balance before making the external call.",
    "evidence": "Code snippet showing the vulnerable pattern"
  }
]
\`\`\`

If the contract is secure and has no vulnerabilities, return an empty array: []`;
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
    analyzerResults: AggregatedAnalyzerResult
  ): Promise<string> {
    const contractCode = await fs.readFile(contractPath, 'utf-8');

    // Format analysis results from all tools
    const toolsSummary = analyzerResults.results.map(result => {
      const toolName = result.tool.charAt(0).toUpperCase() + result.tool.slice(1);

      if (!result.success) {
        return `${toolName}: Failed`;
      }

      return `${toolName} (${result.detectors.length} issues):\n${JSON.stringify(result.detectors.map(d => ({
        id: d.id,
        severity: d.severity,
        title: d.title
      })), null, 2)}`;
    }).join('\n\n');

    const prompt = `Provide a comprehensive security analysis of this Solidity smart contract:

CONTRACT CODE:
\`\`\`solidity
${contractCode}
\`\`\`

STATIC ANALYSIS FROM MULTIPLE TOOLS:
${toolsSummary}

TOTAL ISSUES DETECTED:
${analyzerResults.allDetectors.length}

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

  /**
   * Filters out invalid "no finding" reports that state a vulnerability is NOT present
   */
  private isValidFinding(finding: VulnerabilityFinding): boolean {
    const textToCheck = `${finding.title} ${finding.description} ${finding.recommendation}`.toLowerCase();

    // Patterns that indicate this is a "no finding" report
    const invalidPatterns = [
      'no action needed',
      'not vulnerable',
      'does not contain',
      'does not use',
      'does not implement',
      'is not vulnerable',
      'are not applicable',
      'not applicable',
      'no.*detected',
      'no.*present',
      'no.*usage',
      'no.*found',
      'automatically reverts',
      'continue using',
      'not susceptible'
    ];

    // Check if the finding matches any invalid pattern
    for (const pattern of invalidPatterns) {
      if (new RegExp(pattern, 'i').test(textToCheck)) {
        return false;
      }
    }

    // Additional check: If location is N/A and recommendation says "no action needed"
    if (finding.location.toLowerCase().includes('n/a') &&
        finding.recommendation.toLowerCase().includes('no action')) {
      return false;
    }

    // Additional check: Title starts with "No [something]"
    if (/^no\s+\w+/i.test(finding.title.trim())) {
      return false;
    }

    return true;
  }
}
