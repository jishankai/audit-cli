export enum SourceType {
  GITHUB = 'github',
  LOCAL = 'local'
}

export enum ReportFormat {
  MARKDOWN = 'markdown',
  JSON = 'json',
  PDF = 'pdf',
  ALL = 'all'
}

export enum VulnerabilityType {
  // Core Vulnerabilities
  RE_ENTRANCY = 'Re-Entrancy',
  ARITHMETIC_OVERFLOW = 'Arithmetic Overflow and Underflow',
  SELF_DESTRUCT = 'Self Destruct',
  ACCESSING_PRIVATE_DATA = 'Accessing Private Data',
  DELEGATECALL = 'Delegatecall',
  SOURCE_OF_RANDOMNESS = 'Source of Randomness',
  DENIAL_OF_SERVICE = 'Denial of Service',
  PHISHING_TX_ORIGIN = 'Phishing with tx.origin',
  HIDING_MALICIOUS_CODE = 'Hiding Malicious Code with External Contract',
  FRONT_RUNNING = 'Front Running',
  BLOCK_TIMESTAMP_MANIPULATION = 'Block Timestamp Manipulation',
  SIGNATURE_REPLAY = 'Signature Replay',
  BYPASS_CONTRACT_SIZE_CHECK = 'Bypass Contract Size Check',
  DEPLOY_DIFFERENT_CONTRACTS = 'Deploy Different Contracts at Same Address',
  
  // Access Control & Authorization
  UNPROTECTED_INITIALIZER = 'Unprotected Initializer',
  MISSING_ACCESS_CONTROL = 'Missing Access Control',
  CENTRALIZATION_RISK = 'Centralization Risk',
  WEAK_ACCESS_CONTROL = 'Weak Access Control',
  
  // Oracle & Price Manipulation
  ORACLE_MANIPULATION = 'Oracle Manipulation',
  FLASH_LOAN_ATTACK = 'Flash Loan Attack',
  PRICE_MANIPULATION = 'Price Manipulation',
  
  // DeFi Specific
  SLIPPAGE_PROTECTION = 'Insufficient Slippage Protection',
  ROUNDING_ERRORS = 'Rounding Errors and Precision Loss',
  TOKEN_APPROVAL_RACE = 'Token Approval Race Condition',
  
  // Proxy & Upgradability
  UNINITIALIZED_PROXY = 'Uninitialized Proxy',
  STORAGE_COLLISION = 'Storage Collision in Proxy',
  FUNCTION_SELECTOR_COLLISION = 'Function Selector Collision',
  CONSTRUCTOR_IN_UPGRADEABLE = 'Constructor in Upgradeable Contract',
  
  // Token Issues
  ERC20_TRANSFER_RETURN = 'Unchecked ERC20 Transfer Return Value',
  FEE_ON_TRANSFER = 'Fee-on-Transfer and Deflationary Token Issues',
  REBASING_TOKEN = 'Rebasing Token Issues',
  
  // Logic & State
  UNCHECKED_RETURN_VALUE = 'Unchecked Low-Level Call Return Value',
  STATE_VARIABLE_SHADOWING = 'State Variable Shadowing',
  UNINITIALIZED_STATE = 'Uninitialized State Variables',
  LOCKED_ETHER = 'Locked Ether',
  
  // Cross-Chain & Bridge
  CROSS_CHAIN_REPLAY = 'Cross-Chain Replay Attack',
  BRIDGE_VALIDATION = 'Insufficient Bridge Validation',
  
  // MEV & Transaction Ordering
  MEV_VULNERABILITY = 'MEV Vulnerability',
  TRANSACTION_ORDERING = 'Transaction Ordering Dependence',
  
  // Gas & DoS
  GAS_GRIEFING = 'Gas Griefing',
  UNBOUNDED_LOOP = 'Unbounded Loop',
  
  // Miscellaneous Critical
  UNEXPECTED_BALANCE = 'Unexpected Contract Balance and Forced Ether',
  DELEGATECALL_TO_ARBITRARY = 'Delegatecall to Arbitrary Address'
}

export interface AuditConfig {
  sourceType: SourceType;
  sourcePath: string;
  targetFile?: string;
  vulnerabilityChecks: VulnerabilityType[];
  outputPath?: string;
  reportFormats?: ReportFormat[];
}

export interface SlitherResult {
  success: boolean;
  detectors: SlitherDetector[];
  printers: any;
  irCode?: string;
  errors?: string[];
}

export interface SlitherDetector {
  check: string;
  impact: 'High' | 'Medium' | 'Low' | 'Informational';
  confidence: 'High' | 'Medium' | 'Low';
  description: string;
  elements: any[];
  markdown: string;
  first_markdown_element: string;
}

export interface VulnerabilityFinding {
  type: VulnerabilityType;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  title: string;
  description: string;
  location: string;  // Primary location for backward compatibility
  locations?: string[];  // Multiple locations if finding appears in multiple places
  affectedFiles?: string[];  // List of affected files
  recommendation: string;
  evidence?: string;
  occurrences?: number;  // Number of times this issue was found
}

// ===== New Analyzer Abstraction Types =====

// Tool identifier
export type AnalyzerToolType = 'slither' | 'mythril';

// Unified severity levels
export type AnalyzerSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

// Unified detector finding
export interface AnalyzerDetector {
  id: string;                    // check name or swcID
  title: string;                 // human-readable title
  severity: AnalyzerSeverity;    // normalized severity
  description: string;           // detailed description
  location: string;              // where the issue is
  source: AnalyzerToolType;      // which tool found this
  rawData: any;                  // original detector object
}

// Unified analyzer result
export interface AnalyzerResult {
  tool: AnalyzerToolType;
  success: boolean;
  errors: string[];
  detectors: AnalyzerDetector[];
  supplementaryData?: {
    printers?: any;      // Slither-specific
    irCode?: string;     // Slither-specific
  };
}

// Multi-tool aggregated result
export interface AggregatedAnalyzerResult {
  results: AnalyzerResult[];
  allDetectors: AnalyzerDetector[];
  successCount: number;
  totalTools: number;
  errors: string[];
}

// ===== End New Types =====

export interface AuditReport {
  projectName: string;
  auditDate: string;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    infoIssues: number;
  };
  findings: VulnerabilityFinding[];
  staticAnalysis: AggregatedAnalyzerResult;  // Changed from slitherAnalysis
  slitherAnalysis?: SlitherResult;           // Deprecated, kept for backward compatibility
  llmAnalysis: string;
}
