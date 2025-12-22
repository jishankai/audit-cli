# Smart Contract Audit CLI

An AI-powered smart contract security audit tool that combines Slither static analysis with Claude AI for comprehensive vulnerability detection.

## Features

- **Multiple Source Options**: Audit contracts from GitHub repositories or local files
- **Slither Integration**: Automated static analysis and IR extraction
- **AI-Powered Analysis**: Claude AI analyzes contracts for 18+ vulnerability types
- **Interactive CLI**: User-friendly interface with inquirer.js and smart path autocomplete
- **Path Autocomplete**: Fuzzy search and navigation for selecting local paths and files
- **Multiple Report Formats**: Generates detailed Markdown, JSON, and PDF reports
- **24 Vulnerability Types**: Covers all major smart contract security issues

## Vulnerability Coverage

1. Re-Entrancy
2. Arithmetic Overflow and Underflow
3. Self Destruct
4. Accessing Private Data
5. Delegatecall
6. Source of Randomness
7. Denial of Service
8. Phishing with tx.origin
9. Hiding Malicious Code with External Contract
10. Honeypot
11. Front Running
12. Block Timestamp Manipulation
13. Signature Replay
14. Bypass Contract Size Check
15. Deploy Different Contracts at Same Address
16. Vault Inflation Attack
17. WETH Permit
18. 63 / 64 Gas Rule

## Prerequisites

- Node.js >= 16
- Python 3.8+
- Slither (install with: `pip3 install slither-analyzer`)
- AI API Key (choose one):
  - Anthropic API Key (for Claude)
  - OpenAI API Key (for GPT-4)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd audit-cli

# Install dependencies
npm install

# Build the project
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

## Usage

### Interactive Mode (Recommended)

```bash
npm start
```

The CLI will guide you through:
1. Selecting source type (GitHub or Local)
2. Providing the source path/URL
3. Optionally selecting a specific file
4. Choosing vulnerability types to check
5. Selecting report formats (Markdown, JSON, PDF)
6. Setting output directory

### Environment Variables

The tool supports both Anthropic Claude and OpenAI GPT models. By default, it uses OpenAI with GPT-4.1.

**Option 1: Using OpenAI GPT-4.1 (Default)**
```bash
export OPENAI_API_KEY=your_openai_key_here
```

**Option 2: Using Anthropic Claude**
```bash
export AI_PROVIDER=anthropic
export ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Option 3: Specify Custom Models**
```bash
# Use specific OpenAI model
export OPENAI_API_KEY=your_key
export OPENAI_MODEL=gpt-4o

# Or use specific Anthropic model
export AI_PROVIDER=anthropic
export ANTHROPIC_API_KEY=your_key
export ANTHROPIC_MODEL=claude-3-opus-20240229
```

Or create a `.env` file:
```
# Use OpenAI with default GPT-4.1
OPENAI_API_KEY=your_openai_key_here

# OR use Anthropic Claude
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Available Models:**
- OpenAI: `gpt-4.1` (default), `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`
- Anthropic: `claude-sonnet-4-20250514` (default), `claude-3-opus-20240229`, `claude-3-sonnet-20240229`

## Example Workflow

1. Start the audit tool:
   ```bash
   npm start
   ```

2. Select source type: `GitHub Repository` or `Local Directory/File`

3. Enter the path:
   - GitHub: `https://github.com/username/repo`
   - Local: `/path/to/contracts`

4. Choose vulnerability checks (use spacebar to select)

5. Wait for analysis to complete

6. Review the generated report in `./reports/`

## Report Output

The tool generates reports in your selected formats:
- `audit-report-{timestamp}.md`: Human-readable Markdown report
- `audit-report-{timestamp}.json`: Machine-readable JSON report
- `audit-report-{timestamp}.pdf`: Professional PDF report with styled formatting

### PDF Report Features
- Professional styling with color-coded severity levels
- Print-optimized layout with proper page breaks
- Syntax-highlighted code blocks
- Clean, corporate-ready format for sharing with clients or stakeholders

### Report Sections

1. **Executive Summary**: Overview of findings by severity
2. **Critical/High/Medium/Low Findings**: Detailed vulnerability reports
3. **Slither Analysis**: Automated static analysis results
4. **AI Analysis**: Claude AI comprehensive review
5. **Recommendations**: Prioritized remediation steps

## Development

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test
```

## Project Structure

```
audit-cli/
├── src/
│   ├── index.ts              # Entry point
│   ├── cli.ts                # Interactive CLI
│   ├── orchestrator.ts       # Main audit logic
│   ├── types/                # TypeScript types
│   ├── fetcher/              # GitHub/local file fetching
│   ├── slither/              # Slither integration
│   ├── auditor/              # LLM-based analysis
│   ├── vulnerabilities/      # Vulnerability knowledge base
│   └── reporter/             # Report generation
├── package.json
├── tsconfig.json
└── README.md
```

## Security Notes

- This tool is designed for authorized security testing and educational purposes
- Results should be verified by security professionals
- AI analysis complements but does not replace human expertise
- Always perform manual code review in addition to automated analysis

## Limitations

- Slither must be installed and accessible in PATH
- Requires Anthropic API key for AI analysis
- Analysis quality depends on code complexity and documentation
- Some vulnerabilities may require manual verification

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review Slither documentation: https://github.com/crytic/slither

## Acknowledgments

- Slither by Trail of Bits
- Claude AI by Anthropic
- inquirer.js for interactive CLI
