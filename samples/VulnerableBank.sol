// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VulnerableBank
 * @notice This contract contains intentional vulnerabilities for testing purposes
 * WARNING: DO NOT USE IN PRODUCTION
 */
contract VulnerableBank {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // Reentrancy vulnerability
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // Vulnerable: external call before state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        balances[msg.sender] -= amount;
    }

    // tx.origin vulnerability
    function transferOwnership(address newOwner) public {
        // Vulnerable: using tx.origin instead of msg.sender
        require(tx.origin == owner, "Not owner");
        owner = newOwner;
    }

    // Timestamp manipulation vulnerability
    function isLotteryTime() public view returns (bool) {
        // Vulnerable: using block.timestamp for critical logic
        return block.timestamp % 15 == 0;
    }

    // Weak randomness
    function random() public view returns (uint256) {
        // Vulnerable: predictable randomness
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty)));
    }

    // Unprotected self-destruct (commented out for safety)
    // function destroy() public {
    //     // Vulnerable: no access control
    //     selfdestruct(payable(msg.sender));
    // }

    // Delegatecall vulnerability
    function execute(address target, bytes memory data) public {
        // Vulnerable: delegatecall to arbitrary address
        (bool success, ) = target.delegatecall(data);
        require(success, "Delegatecall failed");
    }

    // DoS with unbounded loop
    address[] public users;

    function distributeRewards() public {
        // Vulnerable: unbounded loop can exceed gas limit
        for (uint256 i = 0; i < users.length; i++) {
            payable(users[i]).transfer(1 ether);
        }
    }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
        users.push(msg.sender);
    }

    // Accessing "private" data
    bytes32 private secretPassword = keccak256("myPassword123");

    function checkPassword(string memory password) public view returns (bool) {
        // Note: private variables are not truly private on blockchain
        return keccak256(abi.encodePacked(password)) == secretPassword;
    }

    receive() external payable {
        balances[msg.sender] += msg.value;
    }
}
