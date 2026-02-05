// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockWLD
 * @notice Test WLD token for World Chain Sepolia
 */
contract MockWLD is ERC20, Ownable {
    constructor() ERC20("Mock WLD", "WLD") {
        // Mint 1 million WLD to deployer for testing
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    /// @notice Anyone can mint test tokens (for testing only!)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Faucet - get 100 WLD for free
    function faucet() external {
        _mint(msg.sender, 100 * 1e18);
    }
}
