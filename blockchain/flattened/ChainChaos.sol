// Sources flattened with hardhat v2.25.0 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// File @openzeppelin/contracts/access/Ownable.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// File @openzeppelin/contracts/interfaces/IERC165.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC165.sol)

pragma solidity ^0.8.20;

// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

// File @openzeppelin/contracts/interfaces/IERC20.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC20.sol)

pragma solidity ^0.8.20;

// File @openzeppelin/contracts/interfaces/IERC1363.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/IERC1363.sol)

pragma solidity ^0.8.20;

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(
        address spender,
        uint256 value
    ) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(
        address spender,
        uint256 value,
        bytes calldata data
    ) external returns (bool);
}

// File @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

pragma solidity ^0.8.20;

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(
        address spender,
        uint256 currentAllowance,
        uint256 requestedDecrease
    );

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(
            token,
            abi.encodeCall(token.transferFrom, (from, to, value))
        );
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(
        IERC20 token,
        address to,
        uint256 value
    ) internal returns (bool) {
        return
            _callOptionalReturnBool(
                token,
                abi.encodeCall(token.transfer, (to, value))
            );
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value
    ) internal returns (bool) {
        return
            _callOptionalReturnBool(
                token,
                abi.encodeCall(token.transferFrom, (from, to, value))
            );
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(
        IERC20 token,
        address spender,
        uint256 requestedDecrease
    ) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(
                    spender,
                    currentAllowance,
                    requestedDecrease
                );
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        bytes memory approvalCall = abi.encodeCall(
            token.approve,
            (spender, value)
        );

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(
                token,
                abi.encodeCall(token.approve, (spender, 0))
            );
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(
        IERC1363 token,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(
        IERC1363 token,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(
                gas(),
                token,
                0,
                add(data, 0x20),
                mload(data),
                0,
                0x20
            )
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (
            returnSize == 0 ? address(token).code.length == 0 : returnValue != 1
        ) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(
        IERC20 token,
        bytes memory data
    ) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(
                gas(),
                token,
                0,
                add(data, 0x20),
                mload(data),
                0,
                0x20
            )
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return
            success &&
            (
                returnSize == 0
                    ? address(token).code.length > 0
                    : returnValue == 1
            );
    }
}

// File contracts/ChainChaos.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.21;

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
