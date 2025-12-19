export enum SourceType {
  GITHUB = 'github',
  LOCAL = 'local'
}

export enum VulnerabilityType {
  RE_ENTRANCY = 'Re-Entrancy',
  ARITHMETIC_OVERFLOW = 'Arithmetic Overflow and Underflow',
  SELF_DESTRUCT = 'Self Destruct',
  ACCESSING_PRIVATE_DATA = 'Accessing Private Data',
  DELEGATECALL = 'Delegatecall',
  SOURCE_OF_RANDOMNESS = 'Source of Randomness',
  DENIAL_OF_SERVICE = 'Denial of Service',
  PHISHING_TX_ORIGIN = 'Phishing with tx.origin',
  HIDING_MALICIOUS_CODE = 'Hiding Malicious Code with External Contract',
  HONEYPOT = 'Honeypot',
  FRONT_RUNNING = 'Front Running',
  BLOCK_TIMESTAMP_MANIPULATION = 'Block Timestamp Manipulation',
  SIGNATURE_REPLAY = 'Signature Replay',
  BYPASS_CONTRACT_SIZE_CHECK = 'Bypass Contract Size Check',
  DEPLOY_DIFFERENT_CONTRACTS = 'Deploy Different Contracts at Same Address',
  VAULT_INFLATION_ATTACK = 'Vault Inflation Attack',
  WETH_PERMIT = 'WETH Permit',
  GAS_RULE_63_64 = '63 / 64 Gas Rule'
}

export interface AuditConfig {
  sourceType: SourceType;
  sourcePath: string;
  targetFile?: string;
  vulnerabilityChecks: VulnerabilityType[];
  outputPath?: string;
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
  location: string;
  recommendation: string;
  evidence?: string;
}

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
  slitherAnalysis: SlitherResult;
  llmAnalysis: string;
}
