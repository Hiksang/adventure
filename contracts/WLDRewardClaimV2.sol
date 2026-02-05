// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title WLDRewardClaimV2
 * @notice Contract for claiming WLD rewards with meta-transaction support
 * @dev Uses signature-based claims with relayer support for gasless transactions
 *
 * New in V2:
 * - claimFor() function for relayer-based gasless claims
 * - Signature includes recipient address (not msg.sender)
 * - Backward compatible with original claim() function
 */
contract WLDRewardClaimV2 is Ownable2Step, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 public constant MIN_CLAIM_INTERVAL = 1 hours;
    uint256 public constant MAX_CLAIM_INTERVAL = 30 days;
    uint256 public constant MIN_CLAIM_AMOUNT = 0.01 ether; // 0.01 WLD
    uint256 public constant EMERGENCY_TIMELOCK = 48 hours;
    uint256 public constant USER_DAILY_CAP = 10 ether; // 10 WLD per user per day

    // ============ State Variables ============

    IERC20 public immutable wldToken;
    uint256 public immutable deploymentChainId;

    mapping(address => bool) public signers;
    uint256 public signerCount;

    // Authorized relayers for claimFor
    mapping(address => bool) public relayers;

    mapping(address => uint256) public claimed;
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => bool) public usedSignatures;
    mapping(address => uint256) public userDailyClaimed;
    mapping(address => uint256) public userLastClaimDay;

    uint256 public claimInterval;
    uint256 public maxClaimPerTx;
    uint256 public dailyClaimLimit;
    uint256 public dailyClaimed;
    uint256 public lastDailyReset;

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
    event ClaimedFor(
        address indexed user,
        address indexed relayer,
        uint256 indexed nonce,
        uint256 amount,
        uint256 totalClaimed
    );
    event SignerUpdated(address indexed signer, bool authorized);
    event RelayerUpdated(address indexed relayer, bool authorized);
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
    error UnauthorizedRelayer();

    // ============ Constructor ============

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
        lastDailyReset = (block.timestamp / 1 days) * 1 days;

        emit SignerUpdated(_signer, true);
    }

    // ============ External Functions ============

    /**
     * @notice Claim WLD rewards (caller is recipient)
     * @param totalEarned Total accumulated rewards for this user
     * @param expiry Signature expiration timestamp
     * @param signature Backend-generated signature
     */
    function claim(
        uint256 totalEarned,
        uint256 expiry,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        _claimInternal(msg.sender, totalEarned, expiry, signature, false);
    }

    /**
     * @notice Claim WLD rewards on behalf of a user (for gasless transactions)
     * @dev Only callable by authorized relayers
     * @param user The recipient of the WLD tokens
     * @param totalEarned Total accumulated rewards for the user
     * @param expiry Signature expiration timestamp
     * @param signature Backend-generated signature (includes user address)
     */
    function claimFor(
        address user,
        uint256 totalEarned,
        uint256 expiry,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        if (!relayers[msg.sender]) revert UnauthorizedRelayer();
        if (user == address(0)) revert ZeroAddress();

        _claimInternal(user, totalEarned, expiry, signature, true);

        emit ClaimedFor(user, msg.sender, nonces[user] - 1, totalEarned - claimed[user] + (totalEarned - claimed[user]), totalEarned);
    }

    /**
     * @notice Internal claim logic shared by claim() and claimFor()
     */
    function _claimInternal(
        address user,
        uint256 totalEarned,
        uint256 expiry,
        bytes calldata signature,
        bool isRelayed
    ) internal {
        if (block.chainid != deploymentChainId) revert ChainIdMismatch();
        if (block.timestamp >= expiry) revert SignatureExpired();

        // Check claim interval
        {
            uint256 nextClaimTime = lastClaimTime[user] + claimInterval;
            if (block.timestamp < nextClaimTime) revert ClaimTooSoon(nextClaimTime);
        }

        // Verify and consume signature
        uint256 currentNonce = _verifyAndConsumeSignatureFor(user, totalEarned, expiry, signature);

        // Calculate and validate claimable amount
        uint256 claimable = _calculateClaimableFor(user, totalEarned);

        // Check per-user daily limit
        _checkAndUpdateUserDailyLimit(user, claimable);

        // Check global daily limit
        _checkAndUpdateDailyLimit(claimable);

        // Check contract balance
        if (wldToken.balanceOf(address(this)) < claimable) revert InsufficientBalance();

        // Update state
        claimed[user] = totalEarned;
        lastClaimTime[user] = block.timestamp;
        nonces[user] = currentNonce + 1;

        // Transfer WLD to user
        wldToken.safeTransfer(user, claimable);

        emit Claimed(user, currentNonce, claimable, totalEarned, block.timestamp + claimInterval);
    }

    /**
     * @notice Verify signature for a specific user (supports claimFor)
     */
    function _verifyAndConsumeSignatureFor(
        address user,
        uint256 totalEarned,
        uint256 expiry,
        bytes calldata signature
    ) internal returns (uint256 currentNonce) {
        bytes32 sigHash = keccak256(signature);
        if (usedSignatures[sigHash]) revert SignatureAlreadyUsed();

        currentNonce = nonces[user];

        // Signature covers: chainId, contract, USER (not msg.sender), totalEarned, nonce, expiry
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                user,  // User address, not msg.sender
                totalEarned,
                currentNonce,
                expiry
            )
        );
        bytes32 ethSignedHash = ECDSA.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedHash, signature);

        if (!signers[recoveredSigner]) revert InvalidSignature();

        usedSignatures[sigHash] = true;
    }

    /**
     * @notice Calculate claimable amount for a specific user
     */
    function _calculateClaimableFor(address user, uint256 totalEarned) internal view returns (uint256 claimable) {
        uint256 alreadyClaimed = claimed[user];
        if (totalEarned <= alreadyClaimed) revert NothingToClaim();

        claimable = totalEarned - alreadyClaimed;
        if (claimable < MIN_CLAIM_AMOUNT) revert BelowMinimumClaim(MIN_CLAIM_AMOUNT);
        if (claimable > maxClaimPerTx) revert ExceedsMaxPerTx(maxClaimPerTx);
    }

    /**
     * @notice Get claimable amount and next claim time for a user
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

    function verifySignature(
        address user,
        uint256 totalEarned,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external view returns (bool valid, string memory reason) {
        if (block.timestamp >= expiry) return (false, "Signature expired");
        if (nonce != nonces[user]) return (false, "Invalid nonce");

        bytes32 sigHash = keccak256(signature);
        if (usedSignatures[sigHash]) return (false, "Signature already used");

        bytes32 messageHash = keccak256(
            abi.encodePacked(block.chainid, address(this), user, totalEarned, nonce, expiry)
        );
        bytes32 ethSignedHash = ECDSA.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedHash, signature);

        if (!signers[recoveredSigner]) return (false, "Invalid signer");
        return (true, "");
    }

    function availableBalance() external view returns (uint256) {
        return wldToken.balanceOf(address(this));
    }

    function remainingDailyLimit() external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastDailyReset / 1 days;
        if (currentDay > lastResetDay) return dailyClaimLimit;
        return dailyClaimLimit > dailyClaimed ? dailyClaimLimit - dailyClaimed : 0;
    }

    function remainingUserDailyLimit(address user) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = userLastClaimDay[user] / 1 days;
        if (currentDay > lastResetDay) return USER_DAILY_CAP;
        return USER_DAILY_CAP > userDailyClaimed[user] ? USER_DAILY_CAP - userDailyClaimed[user] : 0;
    }

    // ============ Admin Functions ============

    function setSigner(address _signer, bool _authorized) external onlyOwner {
        if (_signer == address(0)) revert ZeroAddress();
        bool currentStatus = signers[_signer];
        if (currentStatus == _authorized) return;

        if (_authorized) {
            signerCount++;
        } else {
            if (signerCount <= 1) revert NoActiveSigners();
            signerCount--;
        }

        signers[_signer] = _authorized;
        emit SignerUpdated(_signer, _authorized);
    }

    function setRelayer(address _relayer, bool _authorized) external onlyOwner {
        if (_relayer == address(0)) revert ZeroAddress();
        relayers[_relayer] = _authorized;
        emit RelayerUpdated(_relayer, _authorized);
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

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

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

    function executeEmergencyWithdraw() external onlyOwner nonReentrant {
        WithdrawRequest storage request = pendingWithdraw;
        if (request.executeAfter == 0) revert NoWithdrawPending();
        if (block.timestamp < request.executeAfter) revert WithdrawNotReady();
        if (request.executed) revert NoWithdrawPending();

        request.executed = true;
        address token = request.token;
        uint256 amount = request.amount;
        delete pendingWithdraw;
        pendingWithdraw.executed = true;

        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdrawExecuted(token, amount);
    }

    function cancelEmergencyWithdraw() external onlyOwner {
        if (pendingWithdraw.executeAfter == 0) revert NoWithdrawPending();
        delete pendingWithdraw;
        emit EmergencyWithdrawCancelled();
    }

    // ============ Internal Functions ============

    function _checkAndUpdateUserDailyLimit(address user, uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = userLastClaimDay[user] / 1 days;

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

    function _checkAndUpdateDailyLimit(uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastDailyReset / 1 days;

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
