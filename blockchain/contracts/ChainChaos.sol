// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ChainChaos - Simple Manual Betting Game
/// @notice Owner creates bets manually, players participate, owner settles manually.

contract ChainChaos is Ownable {
    using SafeERC20 for IERC20;

    // Custom Errors
    error BetNotActive();
    error BetTooSmall();
    error BetTooLarge();
    error InsufficientUSDCAllowance();
    error BetAlreadySettled();
    error NoWinnersProvided();
    error BetNotSettled();
    error NoRefundAvailable();
    error NotWinnerOrAlreadyClaimed();
    error InvalidWinnerIndices();
    error InvalidBetId();
    error InvalidBetAmount();
    error WrongCurrency();
    error PlayerAlreadyBet();
    error BettingCutoffPeriod();

    enum CurrencyType {
        NATIVE, // TXZ
        USDC
    }

    enum BetStatus {
        ACTIVE,
        SETTLED,
        CANCELLED
    }

    struct PlayerBet {
        address player;
        uint256 guess;
        bool claimed;
    }

    struct Bet {
        uint256 id;
        string category; // e.g. "gas_price", "transaction_count"
        string description;
        CurrencyType currencyType; // Which currency this bet accepts
        uint256 betAmount; // Fixed amount everyone must bet
        uint256 actualValue; // Set when settled
        BetStatus status;
        uint256 totalPot; // Total pot for this bet
        uint256[] winnerIndices;
        bool refundMode; // True if <= 1 unique player
        PlayerBet[] playerBets;
        uint256 createdAt;
        uint256 startTime; // When betting starts (informational)
        uint256 endTime; // When betting ends (informational)
        // Automation metadata
        uint256 startBlockHeight; // Block height when bet started
        uint256 endBlockHeight; // Block height when bet ended
        uint256[] sampledBlocks; // Blocks sampled for calculation (if applicable)
        string calculationMethod; // Description of how result was calculated
        bool isAutomated; // Whether this bet was created/settled automatically
    }

    uint256 public constant OWNER_FEE_PERCENT = 5; // 5% owner fee
    uint256 public constant BETTING_CUTOFF_PERIOD = 1 minutes; // No betting 2 minutes before end
    uint256 public constant BET_DURATION = 5 minutes; // Bet duration
    uint256 public nextBetId = 1;

    mapping(uint256 => Bet) public bets;
    mapping(uint256 => mapping(address => bool)) public hasPlayerBet;
    uint256[] public activeBetIds;
    uint256[] public settledBetIds;

    IERC20 public immutable usdcToken;

    /// Events
    event BetCreated(
        uint256 indexed betId,
        string category,
        string description,
        CurrencyType currencyType,
        uint256 betAmount
    );

    event PlayerBetPlaced(
        uint256 indexed betId,
        address indexed player,
        uint256 guess
    );

    event BetSettled(
        uint256 indexed betId,
        uint256 actualValue,
        uint256[] winnerIndices,
        uint256 totalPayout
    );

    event BetCancelled(uint256 indexed betId);

    event PrizeClaimed(
        uint256 indexed betId,
        address indexed player,
        uint256 amount
    );

    event RefundClaimed(
        uint256 indexed betId,
        address indexed player,
        uint256 amount
    );

    /// @param _usdcToken Address of USDC token contract
    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
    }

    /// @notice Create a new bet (owner only)
    /// @param category The prediction category
    /// @param description Human readable description
    /// @param currencyType Currency type (NATIVE or USDC)
    /// @param betAmount Fixed bet amount in wei/smallest unit
    /// @param startTime Optional start time (0 for immediate)
    /// @param endTime Optional end time (0 for no limit)
    function createBet(
        string memory category,
        string memory description,
        CurrencyType currencyType,
        uint256 betAmount,
        uint256 startTime,
        uint256 endTime
    ) external onlyOwner returns (uint256) {
        return
            _createBet(
                category,
                description,
                currencyType,
                betAmount,
                startTime,
                endTime
            );
    }

    /// @notice Create an automated bet with metadata (owner only)
    /// @param category The prediction category
    /// @param description Human readable description
    /// @param currencyType Currency type (NATIVE or USDC)
    /// @param betAmount Fixed bet amount in wei/smallest unit
    /// @param startTime Start time
    /// @param endTime End time
    /// @param startBlockHeight Block height when bet started
    /// @param calculationMethod Description of calculation method
    function createAutomatedBet(
        string memory category,
        string memory description,
        CurrencyType currencyType,
        uint256 betAmount,
        uint256 startTime,
        uint256 endTime,
        uint256 startBlockHeight,
        string memory calculationMethod
    ) external onlyOwner returns (uint256) {
        uint256 betId = _createBet(
            category,
            description,
            currencyType,
            betAmount,
            startTime,
            endTime
        );

        // Add automation metadata
        Bet storage bet = bets[betId];
        bet.startBlockHeight = startBlockHeight;
        bet.calculationMethod = calculationMethod;
        bet.isAutomated = true;

        return betId;
    }

    /// @notice Settle an automated bet with full metadata (owner only)
    /// @param betId The bet ID to settle
    /// @param actualValue The calculated result value
    /// @param endBlockHeight Block height when calculation ended
    /// @param sampledBlocks Array of block numbers that were sampled (if applicable)
    /// @param calculationDetails Description of how the result was calculated
    function settleAutomatedBet(
        uint256 betId,
        uint256 actualValue,
        uint256 endBlockHeight,
        uint256[] memory sampledBlocks,
        string memory calculationDetails
    ) external onlyOwner {
        Bet storage bet = bets[betId];

        if (bet.status != BetStatus.ACTIVE) {
            revert BetAlreadySettled();
        }

        // Add automation metadata
        bet.endBlockHeight = endBlockHeight;
        bet.sampledBlocks = sampledBlocks;
        bet.calculationMethod = calculationDetails;

        // Settle the bet
        _settleBet(betId, actualValue);
    }

    /// @notice Internal function to create a bet
    function _createBet(
        string memory category,
        string memory description,
        CurrencyType currencyType,
        uint256 betAmount,
        uint256 startTime,
        uint256 endTime
    ) internal returns (uint256) {
        if (betAmount == 0) {
            revert InvalidBetAmount();
        }

        uint256 betId = nextBetId++;

        Bet storage bet = bets[betId];
        bet.id = betId;
        bet.category = category;
        bet.description = description;
        bet.currencyType = currencyType;
        bet.betAmount = betAmount;
        bet.status = BetStatus.ACTIVE;
        bet.createdAt = block.timestamp;
        bet.startTime = startTime == 0 ? block.timestamp : startTime;
        bet.endTime = endTime == 0 ? block.timestamp + BET_DURATION : endTime;

        activeBetIds.push(betId);

        emit BetCreated(betId, category, description, currencyType, betAmount);

        return betId;
    }

    /// @notice Place a bet guess
    /// @param betId The bet ID
    /// @param guess The player's guess/prediction
    function placeBet(uint256 betId, uint256 guess) external payable {
        Bet storage bet = bets[betId];

        if (bet.status != BetStatus.ACTIVE) {
            revert BetNotActive();
        }

        // Check if we're within the betting cutoff period (2 minutes before end)
        if (
            bet.endTime > 0 &&
            block.timestamp >= (bet.endTime - BETTING_CUTOFF_PERIOD)
        ) {
            revert BettingCutoffPeriod();
        }

        if (hasPlayerBet[betId][msg.sender]) {
            revert PlayerAlreadyBet();
        }

        if (bet.currencyType == CurrencyType.NATIVE) {
            if (msg.value != bet.betAmount) {
                revert InvalidBetAmount();
            }
        } else {
            if (msg.value != 0) {
                revert WrongCurrency();
            }

            // Check USDC allowance
            uint256 allowance = usdcToken.allowance(msg.sender, address(this));
            if (allowance < bet.betAmount) {
                revert InsufficientUSDCAllowance();
            }

            // Transfer USDC from player
            usdcToken.safeTransferFrom(
                msg.sender,
                address(this),
                bet.betAmount
            );
        }

        // Record the bet
        bet.playerBets.push(
            PlayerBet({player: msg.sender, guess: guess, claimed: false})
        );

        bet.totalPot += bet.betAmount;
        hasPlayerBet[betId][msg.sender] = true;

        emit PlayerBetPlaced(betId, msg.sender, guess);
    }

    /// @notice Settle bet by determining actual value and winners (owner only)
    /// @param betId The bet ID to settle
    /// @param actualValue The actual measured value
    function settleBet(uint256 betId, uint256 actualValue) external onlyOwner {
        _settleBet(betId, actualValue);
    }

    /// @notice Internal settle bet function
    function _settleBet(uint256 betId, uint256 actualValue) internal {
        Bet storage bet = bets[betId];

        if (bet.status != BetStatus.ACTIVE) {
            revert BetAlreadySettled();
        }

        bet.actualValue = actualValue;
        bet.status = BetStatus.SETTLED;

        // Remove from active bets
        _removeFromActiveBets(betId);
        settledBetIds.push(betId);

        // Determine winners (closest guesses)
        uint256[] memory winnerIndices = _determineWinners(betId, actualValue);
        bet.winnerIndices = winnerIndices;

        // Check if refund mode (≤1 unique player)
        if (bet.playerBets.length <= 1) {
            bet.refundMode = true;
        }

        uint256 totalPayout = bet.totalPot;

        emit BetSettled(betId, actualValue, winnerIndices, totalPayout);
    }

    /// @notice Cancel a bet and refund all players (owner only)
    /// @param betId The bet ID to cancel
    function cancelBet(uint256 betId) external onlyOwner {
        Bet storage bet = bets[betId];

        if (bet.status != BetStatus.ACTIVE) {
            revert BetAlreadySettled();
        }

        bet.status = BetStatus.CANCELLED;
        bet.refundMode = true; // Everyone gets refunded

        // Remove from active bets
        _removeFromActiveBets(betId);
        settledBetIds.push(betId);

        emit BetCancelled(betId);
    }

    /// @notice Claim prize for winning bet
    /// @param betId The bet ID
    function claimPrize(uint256 betId) external {
        Bet storage bet = bets[betId];

        if (
            bet.status != BetStatus.SETTLED && bet.status != BetStatus.CANCELLED
        ) {
            revert BetNotSettled();
        }

        // Handle refund mode (cancelled bets or ≤1 player)
        if (bet.refundMode) {
            _claimRefund(betId);
            return;
        }

        // Find player's bet and check if winner
        bool isWinner = false;
        uint256 playerIndex = 0;

        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            if (bet.playerBets[i].player == msg.sender) {
                playerIndex = i;
                break;
            }
        }

        // Check if player index is in winner indices
        for (uint256 i = 0; i < bet.winnerIndices.length; i++) {
            if (bet.winnerIndices[i] == playerIndex) {
                isWinner = true;
                break;
            }
        }

        if (!isWinner || bet.playerBets[playerIndex].claimed) {
            revert NotWinnerOrAlreadyClaimed();
        }

        // Mark as claimed
        bet.playerBets[playerIndex].claimed = true;

        // Calculate prize amount
        uint256 ownerFee = (bet.totalPot * OWNER_FEE_PERCENT) / 100;
        uint256 prizePool = bet.totalPot - ownerFee;
        uint256 prizePerWinner = prizePool / bet.winnerIndices.length;

        // Transfer prize
        if (bet.currencyType == CurrencyType.NATIVE) {
            payable(msg.sender).transfer(prizePerWinner);
        } else {
            usdcToken.safeTransfer(msg.sender, prizePerWinner);
        }

        emit PrizeClaimed(betId, msg.sender, prizePerWinner);
    }

    /// @notice Internal function to handle refunds
    function _claimRefund(uint256 betId) internal {
        Bet storage bet = bets[betId];

        // Find player's bet
        uint256 playerIndex = type(uint256).max;
        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            if (bet.playerBets[i].player == msg.sender) {
                playerIndex = i;
                break;
            }
        }

        if (
            playerIndex == type(uint256).max ||
            bet.playerBets[playerIndex].claimed
        ) {
            revert NoRefundAvailable();
        }

        // Mark as claimed
        bet.playerBets[playerIndex].claimed = true;

        // Refund original bet amount
        if (bet.currencyType == CurrencyType.NATIVE) {
            payable(msg.sender).transfer(bet.betAmount);
        } else {
            usdcToken.safeTransfer(msg.sender, bet.betAmount);
        }

        emit RefundClaimed(betId, msg.sender, bet.betAmount);
    }

    /// @notice Withdraw owner fees
    function withdrawFees() external onlyOwner {
        // Calculate total fees from settled non-refund bets
        uint256 totalNativeFees = 0;
        uint256 totalUsdcFees = 0;

        for (uint256 i = 0; i < settledBetIds.length; i++) {
            Bet storage bet = bets[settledBetIds[i]];
            if (!bet.refundMode && bet.totalPot > 0) {
                uint256 fee = (bet.totalPot * OWNER_FEE_PERCENT) / 100;
                if (bet.currencyType == CurrencyType.NATIVE) {
                    totalNativeFees += fee;
                } else {
                    totalUsdcFees += fee;
                }
            }
        }

        // Transfer fees
        if (totalNativeFees > 0) {
            payable(owner()).transfer(totalNativeFees);
        }
        if (totalUsdcFees > 0) {
            usdcToken.safeTransfer(owner(), totalUsdcFees);
        }
    }

    function _absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }

    // View functions
    function getBetInfo(
        uint256 betId
    )
        public
        view
        returns (
            uint256 id,
            string memory category,
            string memory description,
            CurrencyType currencyType,
            uint256 betAmount,
            uint256 actualValue,
            BetStatus status,
            uint256 totalPot,
            bool refundMode,
            uint256 playerBetCount,
            uint256 createdAt,
            uint256 startTime,
            uint256 endTime
        )
    {
        Bet storage bet = bets[betId];
        return (
            bet.id,
            bet.category,
            bet.description,
            bet.currencyType,
            bet.betAmount,
            bet.actualValue,
            bet.status,
            bet.totalPot,
            bet.refundMode,
            bet.playerBets.length,
            bet.createdAt,
            bet.startTime,
            bet.endTime
        );
    }

    function getActiveBets() external view returns (uint256[] memory) {
        return activeBetIds;
    }

    function getSettledBets() external view returns (uint256[] memory) {
        return settledBetIds;
    }

    function getBetPot(uint256 betId) external view returns (uint256) {
        return bets[betId].totalPot;
    }

    function getBetWinnerIndices(
        uint256 betId
    ) external view returns (uint256[] memory) {
        return bets[betId].winnerIndices;
    }

    function getPlayerBet(
        uint256 betId,
        address player
    ) external view returns (uint256 guess, bool claimed) {
        Bet storage bet = bets[betId];
        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            if (bet.playerBets[i].player == player) {
                return (bet.playerBets[i].guess, bet.playerBets[i].claimed);
            }
        }
        revert("Player has not bet on this game");
    }

    function getBetPlayers(
        uint256 betId
    ) external view returns (address[] memory players) {
        Bet storage bet = bets[betId];
        players = new address[](bet.playerBets.length);
        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            players[i] = bet.playerBets[i].player;
        }
    }

    function getBetPlayerGuesses(
        uint256 betId
    ) external view returns (uint256[] memory guesses) {
        Bet storage bet = bets[betId];
        guesses = new uint256[](bet.playerBets.length);
        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            guesses[i] = bet.playerBets[i].guess;
        }
    }

    /// @notice Check if betting is currently active (considering cutoff period)
    /// @param betId The bet ID to check
    /// @return Whether betting is currently active
    function isBettingActive(uint256 betId) external view returns (bool) {
        Bet storage bet = bets[betId];

        if (bet.status != BetStatus.ACTIVE) {
            return false;
        }

        // If no end time is set, betting is active
        if (bet.endTime == 0) {
            return true;
        }

        // Check if we're in the cutoff period
        return block.timestamp <= (bet.endTime - BETTING_CUTOFF_PERIOD);
    }

    /// @notice Get automation metadata for a bet
    /// @param betId The bet ID
    /// @return startBlockHeight Block height when bet started
    /// @return endBlockHeight Block height when bet ended
    /// @return sampledBlocks Array of sampled block numbers
    /// @return calculationMethod Description of calculation method
    /// @return isAutomated Whether the bet was automated
    function getBetAutomationData(
        uint256 betId
    )
        external
        view
        returns (
            uint256 startBlockHeight,
            uint256 endBlockHeight,
            uint256[] memory sampledBlocks,
            string memory calculationMethod,
            bool isAutomated
        )
    {
        Bet storage bet = bets[betId];
        return (
            bet.startBlockHeight,
            bet.endBlockHeight,
            bet.sampledBlocks,
            bet.calculationMethod,
            bet.isAutomated
        );
    }

    /// @notice Get sampled blocks for a bet (convenience function)
    /// @param betId The bet ID
    /// @return Array of sampled block numbers
    function getBetSampledBlocks(
        uint256 betId
    ) external view returns (uint256[] memory) {
        return bets[betId].sampledBlocks;
    }

    /// @notice Get all player bets for a specific bet
    /// @param betId The bet ID
    /// @return Array of player bets (address, guess, claimed)
    function getBetPlayerBets(
        uint256 betId
    ) external view returns (PlayerBet[] memory) {
        return bets[betId].playerBets;
    }

    /// @notice Internal helper to determine winners (closest guesses)
    function _determineWinners(
        uint256 betId,
        uint256 actualValue
    ) internal view returns (uint256[] memory) {
        Bet storage bet = bets[betId];

        if (bet.playerBets.length == 0) {
            return new uint256[](0);
        }

        uint256 minDiff = type(uint256).max;
        uint256 winnerCount = 0;

        // First pass: find minimum difference
        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            uint256 diff = _absDiff(bet.playerBets[i].guess, actualValue);
            if (diff < minDiff) {
                minDiff = diff;
                winnerCount = 1;
            } else if (diff == minDiff) {
                winnerCount++;
            }
        }

        // Second pass: collect winner indices
        uint256[] memory winners = new uint256[](winnerCount);
        uint256 winnerIndex = 0;

        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            uint256 diff = _absDiff(bet.playerBets[i].guess, actualValue);
            if (diff == minDiff) {
                winners[winnerIndex] = i;
                winnerIndex++;
            }
        }

        return winners;
    }

    /// @notice Remove bet from active bets array
    function _removeFromActiveBets(uint256 betId) internal {
        for (uint256 i = 0; i < activeBetIds.length; i++) {
            if (activeBetIds[i] == betId) {
                activeBetIds[i] = activeBetIds[activeBetIds.length - 1];
                activeBetIds.pop();
                break;
            }
        }
    }
}
