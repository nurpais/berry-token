// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { VestingWallet } from "@openzeppelin/contracts/finance/VestingWallet.sol";

/// @title Berry Token (BERRY)
/// @notice ERC20 token for a berry-based payment ecosystem with vesting and access control
contract BerryToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    // Total fixed supply: 88 million BERRY
    uint256 public constant TOTAL_SUPPLY = 88_000_000 * 10 ** 18;

    // Distribution control flags
    bool public blacklistEnabled = true;
    bool public tokensDistributed = false;

    // Blacklist mapping
    mapping(address => bool) public blacklist;

    // Token allocation (fixed percentages of total supply)
    uint256 public constant DEX_LIQUIDITY_AMOUNT = 35_200_000 * 10 ** 18; // 40%
    uint256 public constant PRESALE_AMOUNT = 8_800_000 * 10 ** 18; // 10%
    uint256 public constant RESERVE_AMOUNT = 13_200_000 * 10 ** 18; // 15%
    uint256 public constant TEAM_AMOUNT = 8_800_000 * 10 ** 18; // 10%
    uint256 public constant DISCOUNT_FUND_AMOUNT = 17_600_000 * 10 ** 18; // 20%
    uint256 public constant AUDIT_SECURITY_AMOUNT = 4_400_000 * 10 ** 18; // 5%

    // Events
    event AddressBlacklisted(address indexed account, bool status);
    event BlacklistPermanentlyDisabled();
    event OwnershipRenounced();
    event TokensDistributed(
        address indexed dexLiquidity,
        address indexed presale,
        address indexed reserve
    );

    // Custom errors for better gas efficiency
    error TokenPaused();
    error TokensAlreadyDistributed();
    error InvalidAddress();
    error AddressAlreadyBlacklisted();
    error BlacklistAlreadyDisabled();
    error AlreadyInitialized();

    // Vesting contract reference
    VestingWallet public teamVesting;

    /// @notice Deploys Berry Token and mints the full supply to the contract
    /// @param initialOwner The address to assign as the contract owner
    constructor(address initialOwner) ERC20("Berry Token", "BERRY") Ownable(initialOwner) {
        if (initialOwner == address(0)) revert InvalidAddress();
        _mint(address(this), TOTAL_SUPPLY);
    }

    /// @notice Burns tokens from caller's balance
    /// @param amount The amount of tokens to burn
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Adds or removes an address from blacklist
    function blacklistAddress(address account, bool status) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        blacklist[account] = status;
        emit AddressBlacklisted(account, status);
    }

    /// @notice Permanently disables blacklist functionality
    function disableBlacklist() external onlyOwner {
        if (!blacklistEnabled) revert BlacklistAlreadyDisabled();
        blacklistEnabled = false;
        emit BlacklistPermanentlyDisabled();
    }

    /// @notice Initializes the vesting wallet for the team with cliff and duration
    /// @param teamAddress The beneficiary address
    function setupTeamVesting(address teamAddress) external onlyOwner {
        if (address(teamVesting) != address(0)) revert AlreadyInitialized();
        if (teamAddress == address(0)) revert InvalidAddress();

        uint64 cliff = 180 days;
        uint64 start = uint64(block.timestamp) + cliff;
        uint64 duration = 365 days;

        teamVesting = new VestingWallet(teamAddress, start, duration);
    }

    /// @notice One-time token distribution to predefined categories
    function distributeTokens(
        address dexLiquidity,
        address presale,
        address reserve,
        address discountFund,
        address auditSecurity
    ) external onlyOwner nonReentrant {
        if (tokensDistributed) revert TokensAlreadyDistributed();

        if (
            dexLiquidity == address(0) ||
            presale == address(0) ||
            reserve == address(0) ||
            discountFund == address(0) ||
            auditSecurity == address(0)
        ) revert InvalidAddress();

        _transfer(address(this), dexLiquidity, DEX_LIQUIDITY_AMOUNT);
        _transfer(address(this), presale, PRESALE_AMOUNT);
        _transfer(address(this), reserve, RESERVE_AMOUNT);
        _transfer(address(this), address(teamVesting), TEAM_AMOUNT);
        _transfer(address(this), discountFund, DISCOUNT_FUND_AMOUNT);
        _transfer(address(this), auditSecurity, AUDIT_SECURITY_AMOUNT);

        tokensDistributed = true;
        emit TokensDistributed(dexLiquidity, presale, reserve);
    }

    /// @notice Overridden update function to add pause and blacklist checks
    function _update(address from, address to, uint256 amount) internal override {
        if (paused()) revert TokenPaused();
        if (blacklist[from] || blacklist[to]) revert AddressAlreadyBlacklisted();
        super._update(from, to, amount);
    }

    /// @notice Pauses all token transfers
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses token transfers
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Renounces ownership (irreversible)
    function renounceManagement() external onlyOwner {
        renounceOwnership();
        emit OwnershipRenounced();
    }
}
