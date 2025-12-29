# Smart Contract Audit CLI

An AI-powered smart contract security audit tool that combines multiple static analyzers (Slither & Mythril) with advanced AI models for comprehensive vulnerability detection.

## Features

- **Multiple Analyzers**: Dual static analysis with Slither and Mythril for comprehensive coverage
- **Multiple Source Options**: Audit contracts from GitHub repositories or local files
- **AI-Powered Analysis**: OpenAI GPT-4.1 or Anthropic Claude analyzes contracts for 24+ vulnerability types
- **Smart Provider Selection**: Automatic fallback between AI providers based on API key availability
- **Interactive CLI**: User-friendly interface with inquirer.js and smart path autocomplete
- **Path Autocomplete**: Fuzzy search and navigation for selecting local paths and files
- **Multiple Report Formats**: Generates detailed Markdown, JSON, and PDF reports
- **24 Vulnerability Types**: Covers all major smart contract security issues
- **Robust Error Handling**: Graceful failure handling with detailed error reporting

## Vulnerability Coverage

### Core Vulnerabilities
1. **Re-Entrancy** - External calls before state updates
2. **Arithmetic Overflow and Underflow** - Unchecked mathematical operations
3. **Self Destruct** - Unprotected contract destruction
4. **Accessing Private Data** - False assumptions about blockchain privacy
5. **Delegatecall** - Dangerous context execution
6. **Source of Randomness** - Manipulatable block variables
7. **Denial of Service** - Gas limit exhaustion and blocking operations
8. **Phishing with tx.origin** - Improper authorization checks
9. **Hiding Malicious Code with External Contract** - Untrusted contract calls
10. **Front Running** - Transaction order exploitation and MEV
11. **Block Timestamp Manipulation** - Miner influence on time-dependent logic
12. **Signature Replay** - Missing replay protection mechanisms
13. **Bypass Contract Size Check** - Contract size manipulation
14. **Deploy Different Contracts at Same Address** - CREATE2 exploits

### Access Control & Authorization
15. **Unprotected Initializer** - Upgradeable contract initialization attacks
16. **Missing Access Control** - Unrestricted critical functions
17. **Centralization Risk** - Single point of failure in privileged accounts
18. **Weak Access Control** - Bypassable authentication mechanisms

### Oracle & Price Manipulation
19. **Oracle Manipulation** - Manipulable price sources and lack of TWAP
20. **Flash Loan Attack** - State manipulation through flash loans
21. **Price Manipulation** - AMM price control through large trades

### DeFi Specific
22. **Insufficient Slippage Protection** - Missing output amount validation
23. **Rounding Errors and Precision Loss** - Mathematical calculation errors
24. **Token Approval Race Condition** - ERC20 approve() double-spending

### Proxy & Upgradability
25. **Uninitialized Proxy** - Proxy implementation hijacking
26. **Storage Collision in Proxy** - Storage layout corruption
27. **Function Selector Collision** - Proxy function shadowing
28. **Constructor in Upgradeable Contract** - Non-executed initialization

### Token Issues
29. **Unchecked ERC20 Transfer Return Value** - Silent transfer failures
30. **Fee-on-Transfer and Deflationary Token Issues** - Accounting mismatches
31. **Rebasing Token Issues** - Balance assumption violations

### Logic & State
32. **Unchecked Low-Level Call Return Value** - Silent call failures
33. **State Variable Shadowing** - Inheritance variable conflicts
34. **Uninitialized State Variables** - Default value exploitation
35. **Locked Ether** - Permanent ether locking

### Cross-Chain & Bridge
36. **Cross-Chain Replay Attack** - Signature reuse across chains
37. **Insufficient Bridge Validation** - Weak cross-chain message verification

### MEV & Transaction Ordering
38. **MEV Vulnerability** - Maximum extractable value exploits
39. **Transaction Ordering Dependence** - Race conditions in resource allocation

### Gas & DoS
40. **Gas Griefing** - Excessive gas consumption attacks
41. **Unbounded Loop** - Array iteration DoS

### Miscellaneous Critical
42. **Unexpected Contract Balance and Forced Ether** - Balance assumption violations
43. **Delegatecall to Arbitrary Address** - Complete contract takeover

**Total Coverage**: 43 comprehensive vulnerability types covering all major smart contract security categories.

## Prerequisites

- Node.js >= 16
- Python 3.8+
- Slither (install with: `pip3 install slither-analyzer`)
- Mythril (optional, install with: `pip3 install mythril`)
- AI API Key (choose one):
  - OpenAI API Key (for GPT-4.1 - default)
  - Anthropic API Key (for Claude)

## Installation

### Option 1 (Recommended): Install from npm

```bash
npm install -g @jishankai/audit-cli
```

After installation, you can run the CLI from anywhere:

```bash
audit-cli
```

### Option 2: Install from source (development)

```bash
# Clone the repository
git clone <repository-url>
cd audit-cli

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Interactive Mode (Recommended)

If installed globally:

```bash
audit-cli
```

If running from source:

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

The tool supports both OpenAI GPT and Anthropic Claude models with intelligent fallback. By default, it uses OpenAI with GPT-4.1.

**Quick Setup (Option 1): Using OpenAI GPT-4.1 (Default)**
```bash
export OPENAI_API_KEY=your_openai_key_here
```

**Quick Setup (Option 2): Using Anthropic Claude**
```bash
export ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Advanced Configuration**
```bash
# Specify AI provider explicitly
export AI_PROVIDER=anthropic  # or 'openai'

# Use specific models
export OPENAI_MODEL=gpt-5.2
export ANTHROPIC_MODEL=claude-3-opus-20240229
```

**Using a `.env` file (optional):**

The CLI reads configuration from environment variables (`process.env`). It does **not** automatically load a `.env` file.

For local development, you can still keep a `.env` file and load it in your shell before running the CLI:

```bash
cp .env.example .env
# Edit .env with your API keys

set -a
source .env
set +a

audit-cli
```

**Available Models:**
- **OpenAI**: `gpt-4.1` (default), `gpt-5.2` and more
- **Anthropic**: `claude-sonnet-4-20250514` (default), `claude-3-opus-20240229`, `claude-3-sonnet-20240229` and more

**Smart Fallback**: The tool automatically detects available API keys and uses the appropriate provider. If you provide both keys, it uses the provider specified by `AI_PROVIDER` or defaults to OpenAI.

## Example Workflow

1. Start the audit tool:
   ```bash
   audit-cli
   ```

   (If running from source: `npm start`)

2. Select source type: `GitHub Repository` or `Local Directory/File`

3. Enter the path:
   - GitHub: `https://github.com/username/repo`
   - Local: `/path/to/contracts`

4. Choose vulnerability checks (use spacebar to select)

5. Wait for analysis to complete

6. Review the generated report in `./reports/`

## Report Output

The tool generates comprehensive reports in your selected formats:
- `audit-report-{timestamp}.md`: Human-readable Markdown report
- `audit-report-{timestamp}.json`: Machine-readable JSON report
- `audit-report-{timestamp}.pdf`: Professional PDF report with styled formatting

### PDF Report Features
- Professional styling with color-coded severity levels
- Print-optimized layout with proper page breaks
- Syntax-highlighted code blocks
- Clean, corporate-ready format for sharing with clients or stakeholders

### Report Sections

1. **Executive Summary**: Overview of findings by severity across all analyzers
2. **Critical/High/Medium/Low Findings**: Detailed vulnerability reports from both Slither and Mythril
3. **Static Analysis Results**:
   - **Slither Analysis**: Comprehensive static analysis with IR extraction
   - **Mythril Analysis**: Symbolic execution analysis for deeper security insights
4. **AI Analysis**: Advanced vulnerability assessment using GPT-4.1 or Claude
5. **Recommendations**: Prioritized remediation steps based on aggregated findings

### Multi-Analyzer Benefits
- **Broader Coverage**: Slither excels at detecting common vulnerabilities, while Mythril finds complex state-dependency issues
- **Reduced False Positives**: Cross-validation between analyzers improves accuracy
- **Comprehensive Insights**: Different analysis techniques provide complementary security perspectives

## Development

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

```

## Project Structure

```
audit-cli/
├── src/
│   ├── index.ts                 # Entry point with CLI initialization
│   ├── cli.ts                   # Interactive CLI interface
│   ├── orchestrator.ts          # Main audit orchestration logic
│   ├── analyzers/               # Static analysis tools
│   │   ├── base.ts              # Base analyzer interface
│   │   ├── slither.ts           # Slither integration
│   │   └── mythril.ts           # Mythril integration
│   ├── auditor/                 # AI-powered analysis
│   ├── fetcher/                 # Source code fetching
│   ├── vulnerabilities/         # Vulnerability knowledge base
│   ├── reporter/                # Multi-format report generation
│   └── types/                   # TypeScript type definitions
├── samples/                     # Sample smart contracts for testing
├── package.json
├── tsconfig.json
├── .env.example                 # Environment configuration template
└── README.md
```

## Advanced Usage

### Custom Vulnerability Selection
The interactive CLI allows you to select specific vulnerability types to analyze. Use spacebar to select/deselect items and arrow keys to navigate.

### Running Multiple Analyzers
Both Slither and Mythril run automatically when available. If one analyzer fails or isn't installed, the tool continues with the available analyzers and reports the status of each.

### Debug Mode
Set `DEBUG=true` in your environment to see detailed stack traces and analyzer output for troubleshooting.

### Performance Tips
- Install Mythril for more comprehensive analysis
- Use SSD storage for faster file operations
- Ensure stable internet connection for GitHub repository cloning
- Consider using specific vulnerability types for faster analysis on large codebases

## Security Notes

- This tool is designed for authorized security testing and educational purposes
- Results should be verified by security professionals
- AI analysis complements but does not replace human expertise
- Always perform manual code review in addition to automated analysis

## Limitations

- Slither must be installed and accessible in PATH (Mythril is optional but recommended)
- Requires AI API key (OpenAI or Anthropic) for advanced analysis
- Analysis quality depends on code complexity and documentation quality
- Some vulnerabilities may require manual verification for complete accuracy
- Large repositories may require longer analysis times due to dual analyzer approach
- Network dependencies are required for GitHub repository cloning

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

- **Slither** by Trail of Bits - Static analysis framework
- **Mythril** by ConsenSys - Symbolic execution analysis
- **OpenAI** - GPT-4.1 language model
- **Anthropic** - Claude language models
- **inquirer.js** - Interactive command line interface
- **Node.js ecosystem** - All the amazing open-source dependencies
