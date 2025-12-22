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

  [VulnerabilityType.FRONT_RUNNING]: {
    type: VulnerabilityType.FRONT_RUNNING,
    description: 'Transactions can be front-run by observing the mempool and submitting transactions with higher gas. This includes sandwich attacks (front-run + back-run) and general MEV extraction opportunities.',
    patterns: [
      'Price-dependent transactions without protection',
      'Large swaps without private mempool',
      'Predictable profitable transactions',
      'High slippage tolerance enabling sandwich attacks',
      'No MEV protection mechanisms',
      'No commit-reveal scheme',
      'Auction without protection',
      'Missing deadline or slippage parameters'
    ],
    slitherDetectors: [],
    examples: [
      'swap(tokenIn, tokenOut, amountIn, 0, deadline); // 0 slippage = sandwich vulnerable',
      'addLiquidity(tokenA, tokenB, amountA, amountB, 0, 0, to, deadline); // Sandwich risk',
      'function updatePrice() external { /* Can be front-run */ }'
    ]
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

  // ===== Access Control & Authorization =====
  
  [VulnerabilityType.UNPROTECTED_INITIALIZER]: {
    type: VulnerabilityType.UNPROTECTED_INITIALIZER,
    description: 'Upgradeable contracts with unprotected initialize functions can be hijacked by attackers.',
    patterns: [
      'initialize() without access control',
      'Missing initializer modifier',
      'No onlyOwner on proxy setup',
      '__gap not reserved in upgradeable contracts'
    ],
    slitherDetectors: ['unprotected-initializer'],
    examples: [
      'function initialize() public { owner = msg.sender; }',
      'function __Ownable_init() public { _transferOwnership(msg.sender); }'
    ]
  },

  [VulnerabilityType.MISSING_ACCESS_CONTROL]: {
    type: VulnerabilityType.MISSING_ACCESS_CONTROL,
    description: 'Critical functions that change important state or transfer funds without proper access control. Only applies to genuinely privileged operations, not user-specific actions.',
    patterns: [
      'Public/external admin functions (pause, setFee, setAddress) without modifiers',
      'Functions that change protocol parameters without authorization',
      'Withdrawal of protocol fees/treasury without access control',
      'NOT applicable to user withdrawing their own funds',
      'NOT applicable to view/pure functions'
    ],
    slitherDetectors: ['missing-zero-check', 'protected-vars'],
    examples: [
      'function setFeeRecipient(address _recipient) public { feeRecipient = _recipient; }',
      'function pause() external { _pause(); }',
      'function withdrawProtocolFees() public { owner.transfer(fees); }'
    ]
  },

  [VulnerabilityType.CENTRALIZATION_RISK]: {
    type: VulnerabilityType.CENTRALIZATION_RISK,
    description: 'Over-reliance on single privileged accounts creates systemic risk. Only report when owner can drain user funds, bypass protocol rules, or cause significant harm without timelock/multisig protection.',
    patterns: [
      'Owner can withdraw all user funds without consent',
      'Owner can arbitrarily change critical parameters (fees > 10%, addresses, supply)',
      'No timelock for dangerous operations',
      'Owner can disable withdrawals permanently',
      'NOT applicable to standard Ownable patterns with normal admin functions'
    ],
    slitherDetectors: ['suicidal'],
    examples: [
      'function emergencyWithdraw() onlyOwner { owner.transfer(address(this).balance); } // Drains user funds',
      'function setFee(uint256 newFee) onlyOwner { fee = newFee; } // No upper bound, no timelock',
      'function pause() onlyOwner { _pause(); } // Can freeze forever if no unpause'
    ]
  },

  [VulnerabilityType.WEAK_ACCESS_CONTROL]: {
    type: VulnerabilityType.WEAK_ACCESS_CONTROL,
    description: 'Insufficient or bypassable access control mechanisms that can be circumvented.',
    patterns: [
      'Using assert() for access control',
      'Bypassable authentication checks',
      'Improper role hierarchy',
      'Missing two-step ownership transfer'
    ],
    slitherDetectors: ['incorrect-modifier'],
    examples: [
      'modifier onlyAdmin { assert(admins[msg.sender]); _; }',
      'function transferOwnership(address newOwner) { owner = newOwner; }'
    ]
  },

  // ===== Oracle & Price Manipulation =====

  [VulnerabilityType.ORACLE_MANIPULATION]: {
    type: VulnerabilityType.ORACLE_MANIPULATION,
    description: 'Price oracles that can be manipulated lead to incorrect valuations and potential exploits. This includes using spot prices without time-weighting (TWAP), single DEX sources, and lack of validation.',
    patterns: [
      'Using single DEX as price source',
      'Direct spot price usage without TWAP',
      'getAmountsOut without time delay',
      'Direct reserve ratio usage (reserve1/reserve0)',
      'Current balance-based pricing',
      'No price validation or bounds checking',
      'Instant price updates without time-weighting',
      'Missing stale price checks',
      'No circuit breaker for extreme prices',
      'No averaging mechanism'
    ],
    slitherDetectors: [],
    examples: [
      'uint price = IUniswapV2Pair(pair).getReserves(); // Manipulable spot price',
      'uint price = oracle.latestAnswer(); // No staleness check',
      'price = reserve1 / reserve0; // Direct ratio without TWAP',
      'value = balanceA * balanceB; // Current balance-based'
    ]
  },

  [VulnerabilityType.FLASH_LOAN_ATTACK]: {
    type: VulnerabilityType.FLASH_LOAN_ATTACK,
    description: 'Protocols vulnerable to price or state manipulation through flash loans.',
    patterns: [
      'Price calculation based on current reserves',
      'Governance vulnerable to flash-borrowed voting power',
      'Reward calculations using manipulable state',
      'Missing flash loan protection checks'
    ],
    slitherDetectors: [],
    examples: [
      'uint rewardRate = totalStaked / totalSupply; // Can be manipulated',
      'if (token.balanceOf(address(this)) > threshold) distribute();'
    ]
  },

  [VulnerabilityType.PRICE_MANIPULATION]: {
    type: VulnerabilityType.PRICE_MANIPULATION,
    description: 'Asset prices that can be manipulated through large trades or atomic transactions.',
    patterns: [
      'K constant manipulation in AMMs',
      'Liquidity pool imbalance attacks',
      'Using spot price without time-weighting',
      'Price derived from single transaction'
    ],
    slitherDetectors: [],
    examples: [
      'uint price = reserve1 / reserve0; // Manipulable',
      'function getPrice() returns (uint) { return token1.balanceOf(pool) / token0.balanceOf(pool); }'
    ]
  },

  // ===== DeFi Specific =====

  [VulnerabilityType.SLIPPAGE_PROTECTION]: {
    type: VulnerabilityType.SLIPPAGE_PROTECTION,
    description: 'Insufficient protection against slippage allows users to receive fewer tokens than expected.',
    patterns: [
      'Missing minAmountOut parameter',
      'Hardcoded slippage values',
      'No deadline parameter in swaps',
      'Accepting any output amount'
    ],
    slitherDetectors: [],
    examples: [
      'router.swapExactTokensForTokens(amountIn, 0, path, to, deadline);',
      'vault.withdraw(amount); // No minimum withdrawal check'
    ]
  },

  [VulnerabilityType.ROUNDING_ERRORS]: {
    type: VulnerabilityType.ROUNDING_ERRORS,
    description: 'Rounding errors and precision loss in mathematical calculations can lead to loss of value. This includes division before multiplication, integer truncation, and insufficient decimal precision.',
    patterns: [
      'Division before multiplication',
      'Integer division truncation',
      'Compound rounding errors',
      'Insufficient decimal places',
      'Wrong order of operations',
      'Using small numbers without scaling',
      'Percentage calculations without basis points'
    ],
    slitherDetectors: ['divide-before-multiply'],
    examples: [
      'shares = (amount / totalSupply) * userBalance; // Should be amount * userBalance / totalSupply',
      'fee = price / 1000; // Lost precision',
      'uint percentage = 3; uint result = amount * percentage / 100;',
      'reward = staked / 365; // Daily reward loses precision'
    ]
  },

  [VulnerabilityType.TOKEN_APPROVAL_RACE]: {
    type: VulnerabilityType.TOKEN_APPROVAL_RACE,
    description: 'ERC20 approve() race condition allows double-spending of allowance.',
    patterns: [
      'approve() without checking current allowance',
      'No increaseAllowance/decreaseAllowance usage',
      'Direct approve calls between non-zero values'
    ],
    slitherDetectors: [],
    examples: [
      'token.approve(spender, newAmount); // If previous allowance exists, race condition',
      'function changeApproval(uint newAmount) { token.approve(spender, newAmount); }'
    ]
  },

  // ===== Proxy & Upgradability =====

  [VulnerabilityType.UNINITIALIZED_PROXY]: {
    type: VulnerabilityType.UNINITIALIZED_PROXY,
    description: 'Uninitialized proxy implementations can be hijacked by attackers.',
    patterns: [
      'Implementation contract not initialized',
      'Missing constructor disabling',
      'Initialize can be called on implementation',
      'No _disableInitializers() in constructor'
    ],
    slitherDetectors: ['uninitialized-proxy'],
    examples: [
      'contract Implementation { function initialize() public { owner = msg.sender; } }',
      '// Missing: constructor() { _disableInitializers(); }'
    ]
  },

  [VulnerabilityType.STORAGE_COLLISION]: {
    type: VulnerabilityType.STORAGE_COLLISION,
    description: 'Storage layout collisions between proxy and implementation can corrupt state.',
    patterns: [
      'Changed variable order in upgrade',
      'Different storage layout between versions',
      'Missing storage gaps',
      'New variables inserted before existing ones'
    ],
    slitherDetectors: [],
    examples: [
      '// V1: uint256 a; uint256 b; \n// V2: address newVar; uint256 a; uint256 b; // WRONG',
      'contract Base { uint256 value; } contract Child is Base { uint256 anotherValue; }'
    ]
  },

  [VulnerabilityType.FUNCTION_SELECTOR_COLLISION]: {
    type: VulnerabilityType.FUNCTION_SELECTOR_COLLISION,
    description: 'Function signature collisions can cause unexpected behavior in proxies.',
    patterns: [
      'Same 4-byte selector for different functions',
      'Colliding function names',
      'Proxy function shadowing'
    ],
    slitherDetectors: ['shadowing-abstract'],
    examples: [
      'function collate_propagate_storage(bytes16) external',
      'function burn(uint256) external // Might collide with proxy functions'
    ]
  },

  [VulnerabilityType.CONSTRUCTOR_IN_UPGRADEABLE]: {
    type: VulnerabilityType.CONSTRUCTOR_IN_UPGRADEABLE,
    description: 'Constructors in upgradeable contracts are not executed in proxy context.',
    patterns: [
      'Constructor with initialization logic',
      'State set in constructor',
      'Immutable variables in upgradeable contracts',
      'Not using initializer pattern'
    ],
    slitherDetectors: [],
    examples: [
      'contract Upgradeable { constructor() { owner = msg.sender; } } // Wrong',
      'uint immutable rate; // Cannot use immutable in upgradeable contracts'
    ]
  },

  // ===== Token Issues =====

  [VulnerabilityType.ERC20_TRANSFER_RETURN]: {
    type: VulnerabilityType.ERC20_TRANSFER_RETURN,
    description: 'Not checking return values of ERC20 transfer/transferFrom can lead to failed transfers being ignored.',
    patterns: [
      'transfer() without return value check',
      'transferFrom() without checking result',
      'Not using SafeERC20',
      'Assuming transfer always succeeds'
    ],
    slitherDetectors: ['unchecked-transfer'],
    examples: [
      'token.transfer(recipient, amount); // Unchecked',
      'token.transferFrom(sender, recipient, amount); // Unchecked'
    ]
  },

  [VulnerabilityType.FEE_ON_TRANSFER]: {
    type: VulnerabilityType.FEE_ON_TRANSFER,
    description: 'Tokens that charge fees on transfer or have deflationary mechanisms break protocols expecting full transfer amounts. The actual received amount differs from the specified transfer amount.',
    patterns: [
      'Not measuring actual received amount',
      'Assuming transferred amount equals input amount',
      'No before/after balance checks',
      'Accounting mismatch with fee/deflationary tokens',
      'Incorrect share calculations',
      'Missing pre/post transfer balance comparison'
    ],
    slitherDetectors: [],
    examples: [
      'token.transferFrom(sender, address(this), amount); balance[user] += amount; // Wrong - actual received may be less',
      'function deposit(uint amount) { token.transferFrom(msg.sender, address(this), amount); shares[msg.sender] += amount; }',
      '// Correct: uint balanceBefore = token.balanceOf(address(this)); token.transferFrom(user, address(this), amount); uint actualAmount = token.balanceOf(address(this)) - balanceBefore;'
    ]
  },

  [VulnerabilityType.REBASING_TOKEN]: {
    type: VulnerabilityType.REBASING_TOKEN,
    description: 'Rebasing tokens change balances automatically, breaking internal accounting.',
    patterns: [
      'Storing token balances internally',
      'Share calculations with rebasing tokens',
      'No rebasing token detection',
      'Balance assumptions'
    ],
    slitherDetectors: [],
    examples: [
      'deposits[user] = token.balanceOf(user); // Wrong with rebasing',
      'totalDeposits += amount; // Will desync with actual balance'
    ]
  },

  // ===== Logic & State =====

  [VulnerabilityType.UNCHECKED_RETURN_VALUE]: {
    type: VulnerabilityType.UNCHECKED_RETURN_VALUE,
    description: 'Ignoring return values from low-level calls can lead to silent failures.',
    patterns: [
      'call() without checking success',
      'delegatecall() return value ignored',
      'staticcall() without validation',
      'send() return value not checked'
    ],
    slitherDetectors: ['unchecked-lowlevel', 'unchecked-send'],
    examples: [
      'address(target).call{value: amount}(""); // Unchecked',
      'payable(recipient).send(amount); // Return value ignored'
    ]
  },

  [VulnerabilityType.STATE_VARIABLE_SHADOWING]: {
    type: VulnerabilityType.STATE_VARIABLE_SHADOWING,
    description: 'State variables shadowing inherited ones lead to unexpected behavior.',
    patterns: [
      'Duplicate variable names in inheritance',
      'Child contract redefining parent variable',
      'Storage slot confusion'
    ],
    slitherDetectors: ['shadowing-state'],
    examples: [
      'contract Base { uint owner; } contract Child is Base { address owner; } // Shadowing'
    ]
  },

  [VulnerabilityType.UNINITIALIZED_STATE]: {
    type: VulnerabilityType.UNINITIALIZED_STATE,
    description: 'Uninitialized state variables contain default values which may be exploitable.',
    patterns: [
      'Missing initialization',
      'Default value assumptions',
      'Unset important addresses',
      'Zero values used unintentionally'
    ],
    slitherDetectors: ['uninitialized-state', 'uninitialized-storage'],
    examples: [
      'address public admin; // Defaults to 0x0',
      'uint public threshold; // Defaults to 0'
    ]
  },

  [VulnerabilityType.LOCKED_ETHER]: {
    type: VulnerabilityType.LOCKED_ETHER,
    description: 'Contracts that can receive Ether but have absolutely no way to withdraw it. Must verify there are NO withdrawal functions at all before reporting.',
    patterns: [
      'Payable functions exist but zero withdrawal/transfer functions in entire contract',
      'receive()/fallback() exist but no way to send ETH out',
      'Contract accepts ETH but all withdrawal functions are missing or removed',
      'Must check entire contract - NOT applicable if ANY withdrawal mechanism exists'
    ],
    slitherDetectors: ['locked-ether'],
    examples: [
      'contract NoWithdraw { receive() external payable {} } // Truly no way out',
      'contract Locked { function deposit() payable public {} } // No withdraw() at all'
    ]
  },

  // ===== Cross-Chain & Bridge =====

  [VulnerabilityType.CROSS_CHAIN_REPLAY]: {
    type: VulnerabilityType.CROSS_CHAIN_REPLAY,
    description: 'Signatures or messages can be replayed on different chains without chain ID validation.',
    patterns: [
      'Missing chain ID in signatures',
      'No EIP-712 domain separator',
      'Bridge messages without chain validation',
      'Cross-chain nonce reuse'
    ],
    slitherDetectors: [],
    examples: [
      'bytes32 hash = keccak256(abi.encode(sender, amount)); // Missing chainId',
      'function executeMessage(bytes memory message, bytes memory signature) { /* No chain check */ }'
    ]
  },

  [VulnerabilityType.BRIDGE_VALIDATION]: {
    type: VulnerabilityType.BRIDGE_VALIDATION,
    description: 'Insufficient validation of cross-chain messages in bridge contracts.',
    patterns: [
      'No message authenticity verification',
      'Missing source chain validation',
      'Insufficient signature checks',
      'No message replay protection'
    ],
    slitherDetectors: [],
    examples: [
      'function receiveMessage(bytes calldata data) external { _processMessage(data); } // No validation'
    ]
  },

  // ===== MEV & Transaction Ordering =====

  [VulnerabilityType.MEV_VULNERABILITY]: {
    type: VulnerabilityType.MEV_VULNERABILITY,
    description: 'Transactions exploitable by MEV bots through front-running, back-running, or sandwich attacks.',
    patterns: [
      'Predictable profitable transactions',
      'No MEV protection mechanisms',
      'Exposed liquidation opportunities',
      'Arbitrage-vulnerable pricing'
    ],
    slitherDetectors: [],
    examples: [
      'function liquidate(address user) external { /* Profitable MEV opportunity */ }',
      'function updatePrice() external { /* Can be front-run */ }'
    ]
  },

  [VulnerabilityType.TRANSACTION_ORDERING]: {
    type: VulnerabilityType.TRANSACTION_ORDERING,
    description: 'Logic that depends on specific transaction ordering can be exploited through race conditions. This is DIFFERENT from reentrancy - it applies when multiple users compete for the same resource or when transaction order matters for fairness.',
    patterns: [
      'First-come-first-served resource allocation without protection',
      'Auction or bidding logic without commit-reveal',
      'Winner selection based on transaction order',
      'Limited supply claims without proper synchronization',
      'NOT applicable to simple withdrawals or transfers'
    ],
    slitherDetectors: [],
    examples: [
      'if (available > 0) { winner = msg.sender; available = 0; } // First tx wins',
      'function claimReward() { require(rewardPool > 0); rewardPool = 0; winner.transfer(reward); }',
      'function mintLimited() { require(minted < MAX); minted++; } // Race for limited supply'
    ]
  },

  // ===== Gas & DoS =====

  [VulnerabilityType.GAS_GRIEFING]: {
    type: VulnerabilityType.GAS_GRIEFING,
    description: 'Attackers can cause excessive gas consumption or waste others\' gas.',
    patterns: [
      'Forwarding all gas to untrusted contracts',
      'Relay contracts without gas limits',
      'Expensive operations on behalf of others',
      'No gas stipend for transfers'
    ],
    slitherDetectors: [],
    examples: [
      'target.call{gas: gasleft()}(data); // Griefing possible',
      'for(uint i; i < users.length; i++) { users[i].call(data); } // Gas griefing vector'
    ]
  },

  [VulnerabilityType.UNBOUNDED_LOOP]: {
    type: VulnerabilityType.UNBOUNDED_LOOP,
    description: 'Loops over unbounded arrays that grow over time can exceed block gas limit causing DoS. Only applies to arrays that can grow indefinitely through user actions.',
    patterns: [
      'Iterating over dynamically growing arrays (users, participants, holders)',
      'Loop bounds from push/append operations',
      'Batch operations on expandable collections',
      'NOT applicable to fixed-size operations or single-user state',
      'No pagination for large datasets'
    ],
    slitherDetectors: [],
    examples: [
      'for(uint i = 0; i < allUsers.length; i++) { allUsers[i].transfer(reward); } // allUsers grows',
      'function distributeToAll() { for(uint i; i < stakeholders.length; i++) { distribute(stakeholders[i]); } }',
      'function refundEveryone() { for(uint i; i < buyers.length; i++) { refund(buyers[i]); } }'
    ]
  },

  // ===== Miscellaneous Critical =====

  [VulnerabilityType.UNEXPECTED_BALANCE]: {
    type: VulnerabilityType.UNEXPECTED_BALANCE,
    description: 'Logic that uses strict equality checks or assumptions about contract balance can be broken by forced deposits via selfdestruct. Contracts can be forced to receive Ether, breaking balance assumptions. Only applies when balance is used in critical logic like require(balance == exact_amount) or reward distributions.',
    patterns: [
      'require(address(this).balance == exactAmount)',
      'Strict balance equality checks with == or != operators',
      'Reward/distribution calculations using address(this).balance directly',
      'Assuming balance changes only through designated functions',
      'Logic dependent on exact balance amounts',
      'NOT applicable to simple balance checks like require(balance >= amount)'
    ],
    slitherDetectors: [],
    examples: [
      'require(address(this).balance == totalDeposits); // Can be broken by selfdestruct',
      'reward = address(this).balance / totalShares; // Should track deposits separately',
      'if(address(this).balance == 0) revert(); // Can be bypassed by forced send',
      'require(address(this).balance == expectedBalance); // Vulnerable'
    ]
  },

  [VulnerabilityType.DELEGATECALL_TO_ARBITRARY]: {
    type: VulnerabilityType.DELEGATECALL_TO_ARBITRARY,
    description: 'Delegatecall to user-controlled addresses enables complete contract takeover.',
    patterns: [
      'User-provided delegatecall target',
      'No address whitelist',
      'Unvalidated library address',
      'Arbitrary code execution in contract context'
    ],
    slitherDetectors: ['controlled-delegatecall'],
    examples: [
      'address(userAddress).delegatecall(data); // Complete takeover',
      'function execute(address target, bytes calldata data) { target.delegatecall(data); }'
    ]
  }
};
