import { VulnerabilityType } from '../types';

export interface VulnerabilityInfo {
  type: VulnerabilityType;
  description: string;
  patterns: string[];
  slitherDetectors: string[];
  examples: string[];
}

export const VULNERABILITY_KNOWLEDGE_BASE: Record<VulnerabilityType, VulnerabilityInfo> = {
  [VulnerabilityType.RE_ENTRANCY]: {
    type: VulnerabilityType.RE_ENTRANCY,
    description: 'Reentrancy occurs when external contract calls can call back into the calling contract before the first execution is complete.',
    patterns: [
      'External call before state update',
      'call.value()',
      'transfer() or send() after external call',
      'Lack of reentrancy guard'
    ],
    slitherDetectors: ['reentrancy-eth', 'reentrancy-no-eth', 'reentrancy-benign'],
    examples: ['function withdraw() { msg.sender.call.value(balance)(); balance = 0; }']
  },

  [VulnerabilityType.ARITHMETIC_OVERFLOW]: {
    type: VulnerabilityType.ARITHMETIC_OVERFLOW,
    description: 'Integer overflow and underflow can occur in Solidity versions before 0.8.0 without SafeMath.',
    patterns: [
      'Unchecked arithmetic operations',
      'Missing SafeMath library (pre-0.8.0)',
      'Addition/subtraction without bounds checking'
    ],
    slitherDetectors: ['integer-overflow'],
    examples: ['uint256 result = a + b; // No overflow check']
  },

  [VulnerabilityType.SELF_DESTRUCT]: {
    type: VulnerabilityType.SELF_DESTRUCT,
    description: 'Unprotected selfdestruct can allow attackers to destroy the contract.',
    patterns: [
      'selfdestruct without access control',
      'Public or external selfdestruct',
      'Delegatecall to selfdestruct'
    ],
    slitherDetectors: ['suicidal'],
    examples: ['function kill() public { selfdestruct(payable(msg.sender)); }']
  },

  [VulnerabilityType.ACCESSING_PRIVATE_DATA]: {
    type: VulnerabilityType.ACCESSING_PRIVATE_DATA,
    description: 'Private variables are not truly private on blockchain; they can be read from storage.',
    patterns: [
      'Sensitive data in private variables',
      'Passwords or keys in contract storage',
      'Assuming private means secure'
    ],
    slitherDetectors: [],
    examples: ['bytes32 private password;']
  },

  [VulnerabilityType.DELEGATECALL]: {
    type: VulnerabilityType.DELEGATECALL,
    description: 'Delegatecall executes code in the context of the calling contract, which can be dangerous.',
    patterns: [
      'delegatecall to user-controlled address',
      'Unprotected delegatecall',
      'Library storage collision'
    ],
    slitherDetectors: ['controlled-delegatecall', 'delegatecall-loop'],
    examples: ['address(target).delegatecall(data);']
  },

  [VulnerabilityType.SOURCE_OF_RANDOMNESS]: {
    type: VulnerabilityType.SOURCE_OF_RANDOMNESS,
    description: 'Block variables like blockhash and timestamp are manipulatable and should not be used for randomness.',
    patterns: [
      'block.timestamp for randomness',
      'blockhash for randomness',
      'block.number for random generation'
    ],
    slitherDetectors: ['weak-prng'],
    examples: ['uint256 random = uint256(blockhash(block.number - 1));']
  },

  [VulnerabilityType.DENIAL_OF_SERVICE]: {
    type: VulnerabilityType.DENIAL_OF_SERVICE,
    description: 'Denial of Service attacks can make contracts unusable through gas limit issues or failed transfers.',
    patterns: [
      'Unbounded loops',
      'Array iteration without gas consideration',
      'Failed transfer blocking execution',
      'External call in loop'
    ],
    slitherDetectors: [],
    examples: ['for(uint i = 0; i < users.length; i++) { users[i].transfer(amount); }']
  },

  [VulnerabilityType.PHISHING_TX_ORIGIN]: {
    type: VulnerabilityType.PHISHING_TX_ORIGIN,
    description: 'Using tx.origin for authorization can enable phishing attacks.',
    patterns: [
      'tx.origin for access control',
      'require(tx.origin == owner)',
      'Authorization based on tx.origin'
    ],
    slitherDetectors: ['tx-origin'],
    examples: ['require(tx.origin == owner);']
  },

  [VulnerabilityType.HIDING_MALICIOUS_CODE]: {
    type: VulnerabilityType.HIDING_MALICIOUS_CODE,
    description: 'Malicious code can be hidden in external contracts that are called.',
    patterns: [
      'Calling untrusted external contracts',
      'No interface validation',
      'Dynamic contract calls'
    ],
    slitherDetectors: [],
    examples: ['IContract(userProvidedAddress).execute();']
  },

  [VulnerabilityType.HONEYPOT]: {
    type: VulnerabilityType.HONEYPOT,
    description: 'Honeypot contracts appear vulnerable but have hidden traps.',
    patterns: [
      'Hidden state variables',
      'Constructor tricks',
      'Invisible balance drains',
      'Hidden owner privileges'
    ],
    slitherDetectors: [],
    examples: []
  },

  [VulnerabilityType.FRONT_RUNNING]: {
    type: VulnerabilityType.FRONT_RUNNING,
    description: 'Transactions can be front-run by observing the mempool and submitting transactions with higher gas.',
    patterns: [
      'Price-dependent transactions',
      'No commit-reveal scheme',
      'Auction without protection'
    ],
    slitherDetectors: [],
    examples: []
  },

  [VulnerabilityType.BLOCK_TIMESTAMP_MANIPULATION]: {
    type: VulnerabilityType.BLOCK_TIMESTAMP_MANIPULATION,
    description: 'Miners can manipulate block.timestamp within a range, affecting time-dependent logic.',
    patterns: [
      'Critical logic depending on block.timestamp',
      'Time-based unlocking with timestamp',
      'now keyword usage'
    ],
    slitherDetectors: ['timestamp'],
    examples: ['require(block.timestamp > unlockTime);']
  },

  [VulnerabilityType.SIGNATURE_REPLAY]: {
    type: VulnerabilityType.SIGNATURE_REPLAY,
    description: 'Signatures can be replayed on different chains or multiple times without nonce.',
    patterns: [
      'No nonce in signature',
      'Missing chain ID',
      'No replay protection'
    ],
    slitherDetectors: [],
    examples: []
  },

  [VulnerabilityType.BYPASS_CONTRACT_SIZE_CHECK]: {
    type: VulnerabilityType.BYPASS_CONTRACT_SIZE_CHECK,
    description: 'Contract size checks can be bypassed during construction.',
    patterns: [
      'extcodesize for access control',
      'Checking contract size in constructor',
      'isContract() checks'
    ],
    slitherDetectors: [],
    examples: ['require(address(x).code.length > 0);']
  },

  [VulnerabilityType.DEPLOY_DIFFERENT_CONTRACTS]: {
    type: VulnerabilityType.DEPLOY_DIFFERENT_CONTRACTS,
    description: 'CREATE2 can be exploited to deploy different contracts at the same address.',
    patterns: [
      'CREATE2 usage',
      'Contract address prediction',
      'Metamorphic contracts'
    ],
    slitherDetectors: [],
    examples: []
  },

  [VulnerabilityType.VAULT_INFLATION_ATTACK]: {
    type: VulnerabilityType.VAULT_INFLATION_ATTACK,
    description: 'First depositor can manipulate share price in vault contracts.',
    patterns: [
      'Share calculation based on balance',
      'No minimum deposit',
      'Donation before first deposit'
    ],
    slitherDetectors: [],
    examples: []
  },

  [VulnerabilityType.WETH_PERMIT]: {
    type: VulnerabilityType.WETH_PERMIT,
    description: 'WETH permit implementation issues can lead to signature vulnerabilities.',
    patterns: [
      'Permit implementation',
      'EIP-2612 violations',
      'Signature validation issues'
    ],
    slitherDetectors: [],
    examples: []
  },

  [VulnerabilityType.GAS_RULE_63_64]: {
    type: VulnerabilityType.GAS_RULE_63_64,
    description: 'Only 63/64 of gas is forwarded in external calls, which can cause issues.',
    patterns: [
      'Assuming all gas is forwarded',
      'Complex external calls',
      'Nested call chains'
    ],
    slitherDetectors: [],
    examples: []
  }
};
