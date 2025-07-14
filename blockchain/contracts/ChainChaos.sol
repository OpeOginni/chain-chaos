// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ChainChaos - Simple betting game
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
    }

    uint256 public constant OWNER_FEE_PERCENT = 5; // 5% owner fee
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
        bool refundMode
    );

    event BetCancelled(uint256 indexed betId);

    event PrizeClaimed(
        uint256 indexed betId,
        address indexed winner,
        uint256 prize
    );

    event Refunded(
        uint256 indexed betId,
        address indexed player,
        uint256 amount
    );

    event OwnerFeeCollected(uint256 indexed betId, uint256 fee);

    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
    }

    /// @notice Create a new bet
    function createBet(
        string memory category,
        string memory description,
        CurrencyType currencyType,
        uint256 betAmount
    ) external onlyOwner returns (uint256) {
        if (betAmount == 0) {
            revert InvalidBetAmount();
        }

        uint256 betId = nextBetId++;

        Bet storage newBet = bets[betId];
        newBet.id = betId;
        newBet.category = category;
        newBet.description = description;
        newBet.currencyType = currencyType;
        newBet.betAmount = betAmount;
        newBet.status = BetStatus.ACTIVE;
        newBet.createdAt = block.timestamp;

        activeBetIds.push(betId);

        emit BetCreated(betId, category, description, currencyType, betAmount);
        return betId;
    }

    /// @notice Place a bet with native currency
    function placeBetNative(uint256 betId, uint256 guess) external payable {
        Bet storage bet = bets[betId];
        if (bet.status != BetStatus.ACTIVE) {
            revert BetNotActive();
        }
        if (bet.currencyType != CurrencyType.NATIVE) {
            revert WrongCurrency();
        }
        if (msg.value != bet.betAmount) {
            revert InvalidBetAmount();
        }
        if (hasPlayerBet[betId][msg.sender]) {
            revert PlayerAlreadyBet();
        }

        bet.playerBets.push(
            PlayerBet({player: msg.sender, guess: guess, claimed: false})
        );

        bet.totalPot += msg.value;
        hasPlayerBet[betId][msg.sender] = true;

        emit PlayerBetPlaced(betId, msg.sender, guess);
    }

    /// @notice Place a bet with USDC
    function placeBetUSDC(uint256 betId, uint256 guess) external {
        Bet storage bet = bets[betId];
        if (bet.status != BetStatus.ACTIVE) {
            revert BetNotActive();
        }
        if (bet.currencyType != CurrencyType.USDC) {
            revert WrongCurrency();
        }
        if (usdcToken.allowance(msg.sender, address(this)) < bet.betAmount) {
            revert InsufficientUSDCAllowance();
        }
        if (hasPlayerBet[betId][msg.sender]) {
            revert PlayerAlreadyBet();
        }

        usdcToken.safeTransferFrom(msg.sender, address(this), bet.betAmount);

        bet.playerBets.push(
            PlayerBet({player: msg.sender, guess: guess, claimed: false})
        );

        bet.totalPot += bet.betAmount;
        hasPlayerBet[betId][msg.sender] = true;

        emit PlayerBetPlaced(betId, msg.sender, guess);
    }

    /// @notice Settle a bet manually
    function settleBet(uint256 betId, uint256 actualValue) external onlyOwner {
        Bet storage bet = bets[betId];
        if (bet.status != BetStatus.ACTIVE) {
            revert BetNotActive();
        }

        bet.actualValue = actualValue;
        bet.status = BetStatus.SETTLED;

        // Remove from active bets
        _removeFromActiveBets(betId);
        settledBetIds.push(betId);

        // Check if we should refund (≤ 1 unique player)
        if (_shouldRefund(bet)) {
            bet.refundMode = true;
            emit BetSettled(betId, actualValue, new uint256[](0), true);
        } else {
            // Find winners (closest to actual value)
            uint256[] memory winners = _findWinners(bet);
            bet.winnerIndices = winners;

            // Collect owner fees
            _collectOwnerFees(bet);

            emit BetSettled(betId, actualValue, winners, false);
        }
    }

    /// @notice Cancel a bet (refund all players)
    function cancelBet(uint256 betId) external onlyOwner {
        Bet storage bet = bets[betId];
        if (bet.status != BetStatus.ACTIVE) {
            revert BetNotActive();
        }

        bet.status = BetStatus.CANCELLED;
        bet.refundMode = true;

        // Remove from active bets
        _removeFromActiveBets(betId);

        emit BetCancelled(betId);
    }

    /// @notice Claim prize or refund
    function claimPrize(uint256 betId) external {
        Bet storage bet = bets[betId];
        if (bet.status == BetStatus.ACTIVE) {
            revert BetNotSettled();
        }

        if (bet.refundMode || bet.status == BetStatus.CANCELLED) {
            _claimRefund(bet, betId);
        } else {
            _claimWinnerPrize(bet, betId);
        }
    }

    /// @notice Internal function to find winners
    function _findWinners(
        Bet storage bet
    ) internal view returns (uint256[] memory) {
        if (bet.playerBets.length == 0) return new uint256[](0);

        uint256 closestDiff = type(uint256).max;
        uint256 winnerCount = 0;

        // Find closest difference
        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            uint256 diff = _absDiff(bet.playerBets[i].guess, bet.actualValue);
            if (diff < closestDiff) {
                closestDiff = diff;
                winnerCount = 1;
            } else if (diff == closestDiff) {
                winnerCount++;
            }
        }

        // Collect winners
        uint256[] memory winners = new uint256[](winnerCount);
        uint256 index = 0;
        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            uint256 diff = _absDiff(bet.playerBets[i].guess, bet.actualValue);
            if (diff == closestDiff) {
                winners[index++] = i;
            }
        }

        return winners;
    }

    /// @notice Internal function to handle refunds
    function _claimRefund(Bet storage bet, uint256 betId) internal {
        uint256 totalRefund = 0;

        for (uint256 i = 0; i < bet.playerBets.length; i++) {
            if (
                bet.playerBets[i].player == msg.sender &&
                !bet.playerBets[i].claimed
            ) {
                bet.playerBets[i].claimed = true;
                totalRefund += bet.betAmount;
            }
        }

        if (totalRefund == 0) {
            revert NoRefundAvailable();
        }

        if (bet.currencyType == CurrencyType.NATIVE) {
            payable(msg.sender).transfer(totalRefund);
        } else {
            usdcToken.safeTransfer(msg.sender, totalRefund);
        }

        emit Refunded(betId, msg.sender, totalRefund);
    }

    /// @notice Internal function to handle winner prize claims
    function _claimWinnerPrize(Bet storage bet, uint256 betId) internal {
        uint256 userWinningBets = 0;
        bool isWinner = false;

        // Check if sender is a winner and count their winning bets
        for (uint256 i = 0; i < bet.winnerIndices.length; i++) {
            uint256 winnerIndex = bet.winnerIndices[i];
            if (
                bet.playerBets[winnerIndex].player == msg.sender &&
                !bet.playerBets[winnerIndex].claimed
            ) {
                bet.playerBets[winnerIndex].claimed = true;
                userWinningBets++;
                isWinner = true;
            }
        }

        if (!isWinner) {
            revert NotWinnerOrAlreadyClaimed();
        }

        // Calculate prize: (user's winning bets / total winning bets) * remaining pot
        uint256 remainingPot = bet.totalPot -
            (bet.totalPot * OWNER_FEE_PERCENT) /
            100;
        uint256 prize = (userWinningBets * remainingPot) /
            bet.winnerIndices.length;

        if (bet.currencyType == CurrencyType.NATIVE) {
            payable(msg.sender).transfer(prize);
        } else {
            usdcToken.safeTransfer(msg.sender, prize);
        }

        emit PrizeClaimed(betId, msg.sender, prize);
    }

    /// @notice Check if bet should be refunded (≤ 1 unique player)
    function _shouldRefund(Bet storage bet) internal view returns (bool) {
        if (bet.playerBets.length <= 1) return true;

        address firstPlayer = bet.playerBets[0].player;
        for (uint256 i = 1; i < bet.playerBets.length; i++) {
            if (bet.playerBets[i].player != firstPlayer) {
                return false;
            }
        }
        return true;
    }

    /// @notice Collect owner fees
    function _collectOwnerFees(Bet storage bet) internal {
        uint256 fee = (bet.totalPot * OWNER_FEE_PERCENT) / 100;

        if (fee > 0) {
            if (bet.currencyType == CurrencyType.NATIVE) {
                payable(owner()).transfer(fee);
            } else {
                usdcToken.safeTransfer(owner(), fee);
            }
            emit OwnerFeeCollected(bet.id, fee);
        }
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

    function _absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }

    // View functions
    function getBetInfo(
        uint256 betId
    )
        external
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
            uint256 createdAt
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
            bet.createdAt
        );
    }

    function getBetWinnerIndices(
        uint256 betId
    ) external view returns (uint256[] memory) {
        return bets[betId].winnerIndices;
    }

    function getPlayerBet(
        uint256 betId,
        uint256 playerBetIndex
    ) external view returns (address player, uint256 guess, bool claimed) {
        PlayerBet storage playerBet = bets[betId].playerBets[playerBetIndex];
        return (playerBet.player, playerBet.guess, playerBet.claimed);
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

    receive() external payable {}
}
