// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title WLDRewardClaim
 * @notice Contract for claiming WLD rewards earned from watching ads
 * @dev Uses signature-based claims with cross-chain replay protection
 * @custom:security-contact security@example.com
 *
 * Security Features:
 * - EIP-191 signature with chainId, contract address, nonce
 * - Per-user and global daily limits to prevent griefing
 * - 48-hour timelock on emergency withdrawals
 * - Two-step ownership transfer (Ownable2Step)
 * - Reentrancy protection on all state-changing functions
 */
contract WLDRewardClaim is Ownable2Step, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @notice Minimum allowed claim interval (1 hour)
    uint256 public constant MIN_CLAIM_INTERVAL = 1 hours;

    /// @notice Maximum allowed claim interval (30 days)
    uint256 public constant MAX_CLAIM_INTERVAL = 30 days;

    /// @notice Minimum claim amount to prevent dust attacks
    uint256 public constant MIN_CLAIM_AMOUNT = 0.01 ether; // 0.01 WLD

    /// @notice Emergency withdraw timelock duration
    uint256 public constant EMERGENCY_TIMELOCK = 48 hours;

    /// @notice Per-user daily claim cap (prevents single user from exhausting global limit)
    uint256 public constant USER_DAILY_CAP = 10 ether; // 10 WLD per user per day

    // ============ State Variables ============

    IERC20 public immutable wldToken;

    /// @notice Chain ID at deployment (for signature validation)
    uint256 public immutable deploymentChainId;

    /// @notice Authorized signers for claim signatures
    mapping(address => bool) public signers;

    /// @notice Count of active signers
    uint256 public signerCount;

    /// @notice Total amount claimed by each user
    mapping(address => uint256) public claimed;

    /// @notice Last claim timestamp per user
    mapping(address => uint256) public lastClaimTime;

    /// @notice Nonce for each user to prevent signature replay
    mapping(address => uint256) public nonces;

    /// @notice Used signature hashes to prevent replay
    mapping(bytes32 => bool) public usedSignatures;

    /// @notice Per-user daily claimed amount
    mapping(address => uint256) public userDailyClaimed;

    /// @notice Per-user last daily reset timestamp
    mapping(address => uint256) public userLastClaimDay;

    /// @notice Minimum time between claims (default: 24 hours)
    uint256 public claimInterval;

    /// @notice Maximum claimable amount per transaction (safety limit)
    uint256 public maxClaimPerTx;

    /// @notice Daily claim limit across all users
    uint256 public dailyClaimLimit;
    uint256 public dailyClaimed;
    uint256 public lastDailyReset;

    /// @notice Emergency withdraw request
    struct WithdrawRequest {
        address token;
        uint256 amount;
        uint256 executeAfter;
        bool executed;
    }
    WithdrawRequest public pendingWithdraw;

    // ============ Events ============

    event Claimed(
        address indexed user,
        uint256 indexed nonce,
        uint256 amount,
        uint256 totalClaimed,
        uint256 nextClaimTime
    );
    event SignerUpdated(address indexed signer, bool authorized);
    event ClaimIntervalUpdated(uint256 oldInterval, uint256 newInterval);
    event MaxClaimPerTxUpdated(uint256 oldMax, uint256 newMax);
    event DailyClaimLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event EmergencyWithdrawRequested(address indexed token, uint256 amount, uint256 executeAfter);
    event EmergencyWithdrawExecuted(address indexed token, uint256 amount);
    event EmergencyWithdrawCancelled();

    // ============ Errors ============

    error InvalidSignature();
    error SignatureExpired();
    error SignatureAlreadyUsed();
    error ClaimTooSoon(uint256 nextClaimTime);
    error NothingToClaim();
    error BelowMinimumClaim(uint256 minimum);
    error ExceedsMaxPerTx(uint256 maximum);
    error ExceedsDailyLimit(uint256 remaining);
    error ExceedsUserDailyLimit(uint256 remaining);
    error ZeroAddress();
    error InvalidParameter();
    error NoActiveSigners();
    error WithdrawNotReady();
    error NoWithdrawPending();
    error ChainIdMismatch();
    error InsufficientBalance();

    // ============ Constructor ============

    /**
     * @param _wldToken WLD token address on World Chain
     * @param _signer Initial authorized signer
     * @param _claimInterval Minimum time between claims (e.g., 24 hours)
     * @param _maxClaimPerTx Maximum claim per transaction (e.g., 100 WLD)
     * @param _dailyClaimLimit Daily limit across all users (e.g., 10000 WLD)
     */
    constructor(
        address _wldToken,
        address _signer,
        uint256 _claimInterval,
        uint256 _maxClaimPerTx,
        uint256 _dailyClaimLimit
    ) {
        if (_wldToken == address(0) || _signer == address(0)) revert ZeroAddress();
        if (_claimInterval < MIN_CLAIM_INTERVAL || _claimInterval > MAX_CLAIM_INTERVAL) revert InvalidParameter();
        if (_maxClaimPerTx == 0 || _dailyClaimLimit == 0) revert InvalidParameter();
        if (_maxClaimPerTx > _dailyClaimLimit) revert InvalidParameter();

        wldToken = IERC20(_wldToken);
        deploymentChainId = block.chainid;

        signers[_signer] = true;
        signerCount = 1;

        claimInterval = _claimInterval;
        maxClaimPerTx = _maxClaimPerTx;
        dailyClaimLimit = _dailyClaimLimit;
        lastDailyReset = (block.timestamp / 1 days) * 1 days; // Align to day boundary

        emit SignerUpdated(_signer, true);
    }

    // ============ External Functions ============

    /**
     * @notice Claim WLD rewards
     * @param totalEarned Total accumulated rewards for this user (from DB)
     * @param expiry Signature expiration timestamp
     * @param signature Backend-generated signature
     */
    function claim(
        uint256 totalEarned,
        uint256 expiry,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        // Verify chain ID hasn't changed (prevents cross-chain replay)
        if (block.chainid != deploymentChainId) revert ChainIdMismatch();
        if (block.timestamp >= expiry) revert SignatureExpired();

        // Check claim interval (e.g., 24 hours between claims)
        {
            uint256 nextClaimTime = lastClaimTime[msg.sender] + claimInterval;
            if (block.timestamp < nextClaimTime) revert ClaimTooSoon(nextClaimTime);
        }

        // Verify and consume signature
        uint256 currentNonce = _verifyAndConsumeSignature(totalEarned, expiry, signature);

        // Calculate and validate claimable amount
        uint256 claimable = _calculateClaimable(totalEarned);

        // Check per-user daily limit (prevents single user from exhausting global limit)
        _checkAndUpdateUserDailyLimit(msg.sender, claimable);

        // Check global daily limit (with fixed day boundary)
        _checkAndUpdateDailyLimit(claimable);

        // Check contract has sufficient balance
        if (wldToken.balanceOf(address(this)) < claimable) revert InsufficientBalance();

        // Update state (Effects before Interactions)
        claimed[msg.sender] = totalEarned;
        lastClaimTime[msg.sender] = block.timestamp;
        nonces[msg.sender] = currentNonce + 1;

        // Transfer WLD (Interaction)
        wldToken.safeTransfer(msg.sender, claimable);

        emit Claimed(msg.sender, currentNonce, claimable, totalEarned, block.timestamp + claimInterval);
    }

    /**
     * @notice Verify signature and mark as used
     * @dev Extracted to reduce stack depth in claim()
     */
    function _verifyAndConsumeSignature(
        uint256 totalEarned,
        uint256 expiry,
        bytes calldata signature
    ) internal returns (uint256 currentNonce) {
        // Check signature hasn't been used
        bytes32 sigHash = keccak256(signature);
        if (usedSignatures[sigHash]) revert SignatureAlreadyUsed();

        // Get current nonce
        currentNonce = nonces[msg.sender];

        // Verify signature with chain ID, contract address, and nonce
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                totalEarned,
                currentNonce,
                expiry
            )
        );
        bytes32 ethSignedHash = ECDSA.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedHash, signature);

        if (!signers[recoveredSigner]) revert InvalidSignature();

        // Mark signature as used
        usedSignatures[sigHash] = true;
    }

    /**
     * @notice Calculate claimable amount with validation
     * @dev Extracted to reduce stack depth in claim()
     */
    function _calculateClaimable(uint256 totalEarned) internal view returns (uint256 claimable) {
        uint256 alreadyClaimed = claimed[msg.sender];
        if (totalEarned <= alreadyClaimed) revert NothingToClaim();

        claimable = totalEarned - alreadyClaimed;
        if (claimable < MIN_CLAIM_AMOUNT) revert BelowMinimumClaim(MIN_CLAIM_AMOUNT);
        if (claimable > maxClaimPerTx) revert ExceedsMaxPerTx(maxClaimPerTx);
    }

    /**
     * @notice Get claimable amount and next claim time for a user
     * @param user User address
     * @param totalEarned Total earned from backend
     * @return claimable Amount that can be claimed
     * @return nextClaimTime Timestamp when user can claim next
     * @return canClaimNow Whether user can claim right now
     * @return userNonce Current nonce for the user
     */
    function getClaimInfo(
        address user,
        uint256 totalEarned
    ) external view returns (
        uint256 claimable,
        uint256 nextClaimTime,
        bool canClaimNow,
        uint256 userNonce
    ) {
        uint256 alreadyClaimed = claimed[user];
        claimable = totalEarned > alreadyClaimed ? totalEarned - alreadyClaimed : 0;
        nextClaimTime = lastClaimTime[user] + claimInterval;
        canClaimNow = block.timestamp >= nextClaimTime && claimable >= MIN_CLAIM_AMOUNT && !paused();
        userNonce = nonces[user];
    }

    /**
     * @notice Verify a signature without claiming (for frontend validation)
     */
    function verifySignature(
        address user,
        uint256 totalEarned,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external view returns (bool valid, string memory reason) {
        if (block.timestamp >= expiry) {
            return (false, "Signature expired");
        }

        if (nonce != nonces[user]) {
            return (false, "Invalid nonce");
        }

        bytes32 sigHash = keccak256(signature);
        if (usedSignatures[sigHash]) {
            return (false, "Signature already used");
        }

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                user,
                totalEarned,
                nonce,
                expiry
            )
        );
        bytes32 ethSignedHash = ECDSA.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedHash, signature);

        if (!signers[recoveredSigner]) {
            return (false, "Invalid signer");
        }

        return (true, "");
    }

    /**
     * @notice Get contract balance
     */
    function availableBalance() external view returns (uint256) {
        return wldToken.balanceOf(address(this));
    }

    /**
     * @notice Get remaining global daily limit
     */
    function remainingDailyLimit() external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastDailyReset / 1 days;

        if (currentDay > lastResetDay) {
            return dailyClaimLimit;
        }

        return dailyClaimLimit > dailyClaimed ? dailyClaimLimit - dailyClaimed : 0;
    }

    /**
     * @notice Get remaining per-user daily limit
     */
    function remainingUserDailyLimit(address user) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = userLastClaimDay[user] / 1 days;

        if (currentDay > lastResetDay) {
            return USER_DAILY_CAP;
        }

        return USER_DAILY_CAP > userDailyClaimed[user] ? USER_DAILY_CAP - userDailyClaimed[user] : 0;
    }

    // ============ Admin Functions ============

    function setSigner(address _signer, bool _authorized) external onlyOwner {
        if (_signer == address(0)) revert ZeroAddress();

        bool currentStatus = signers[_signer];
        if (currentStatus == _authorized) return; // No change

        if (_authorized) {
            signerCount++;
        } else {
            if (signerCount <= 1) revert NoActiveSigners();
            signerCount--;
        }

        signers[_signer] = _authorized;
        emit SignerUpdated(_signer, _authorized);
    }

    function setClaimInterval(uint256 _interval) external onlyOwner {
        if (_interval < MIN_CLAIM_INTERVAL || _interval > MAX_CLAIM_INTERVAL) revert InvalidParameter();
        uint256 oldInterval = claimInterval;
        claimInterval = _interval;
        emit ClaimIntervalUpdated(oldInterval, _interval);
    }

    function setMaxClaimPerTx(uint256 _max) external onlyOwner {
        if (_max == 0 || _max > dailyClaimLimit) revert InvalidParameter();
        uint256 oldMax = maxClaimPerTx;
        maxClaimPerTx = _max;
        emit MaxClaimPerTxUpdated(oldMax, _max);
    }

    function setDailyClaimLimit(uint256 _limit) external onlyOwner {
        if (_limit == 0 || _limit < maxClaimPerTx) revert InvalidParameter();
        uint256 oldLimit = dailyClaimLimit;
        dailyClaimLimit = _limit;
        emit DailyClaimLimitUpdated(oldLimit, _limit);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Request emergency withdraw (starts timelock)
     */
    function requestEmergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidParameter();

        pendingWithdraw = WithdrawRequest({
            token: token,
            amount: amount,
            executeAfter: block.timestamp + EMERGENCY_TIMELOCK,
            executed: false
        });

        emit EmergencyWithdrawRequested(token, amount, pendingWithdraw.executeAfter);
    }

    /**
     * @notice Execute pending emergency withdraw after timelock
     * @dev Protected by nonReentrant to prevent callback attacks from malicious tokens
     */
    function executeEmergencyWithdraw() external onlyOwner nonReentrant {
        WithdrawRequest storage request = pendingWithdraw;

        if (request.executeAfter == 0) revert NoWithdrawPending();
        if (block.timestamp < request.executeAfter) revert WithdrawNotReady();
        if (request.executed) revert NoWithdrawPending();

        request.executed = true;

        // Cache values before external call
        address token = request.token;
        uint256 amount = request.amount;

        // Clear the struct after execution for cleaner state
        delete pendingWithdraw;
        pendingWithdraw.executed = true; // Mark as executed to prevent re-use

        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdrawExecuted(token, amount);
    }

    /**
     * @notice Cancel pending emergency withdraw
     */
    function cancelEmergencyWithdraw() external onlyOwner {
        if (pendingWithdraw.executeAfter == 0) revert NoWithdrawPending();

        delete pendingWithdraw;
        emit EmergencyWithdrawCancelled();
    }

    // ============ Internal Functions ============

    /**
     * @notice Check and update per-user daily limit
     * @dev Each user can only claim up to USER_DAILY_CAP per day
     */
    function _checkAndUpdateUserDailyLimit(address user, uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = userLastClaimDay[user] / 1 days;

        // Reset user daily counter if new day
        if (currentDay > lastResetDay) {
            userDailyClaimed[user] = 0;
            userLastClaimDay[user] = currentDay * 1 days;
        }

        uint256 newUserDailyClaimed = userDailyClaimed[user] + amount;
        if (newUserDailyClaimed > USER_DAILY_CAP) {
            revert ExceedsUserDailyLimit(USER_DAILY_CAP - userDailyClaimed[user]);
        }

        userDailyClaimed[user] = newUserDailyClaimed;
    }

    /**
     * @notice Check and update global daily limit
     */
    function _checkAndUpdateDailyLimit(uint256 amount) internal {
        // Use fixed day boundaries (midnight UTC)
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastDailyReset / 1 days;

        // Reset daily counter if new day
        if (currentDay > lastResetDay) {
            dailyClaimed = 0;
            lastDailyReset = currentDay * 1 days;
        }

        uint256 newDailyClaimed = dailyClaimed + amount;
        if (newDailyClaimed > dailyClaimLimit) {
            revert ExceedsDailyLimit(dailyClaimLimit - dailyClaimed);
        }

        dailyClaimed = newDailyClaimed;
    }
}
