// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EscrowLib
/// @notice Pure fee and payout arithmetic. No state access.
library EscrowLib {
    uint256 internal constant PROTOCOL_FEE_BPS = 200; // 2%
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    /// @return fee      Amount that goes to the treasury.
    /// @return payout   Amount that goes to the winner.
    function calcFeeAndPayout(uint96 amount) internal pure returns (uint96 fee, uint96 payout) {
        // safe: amount is uint96; fee <= amount so result fits in uint96
        fee = uint96((uint256(amount) * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR);
        payout = amount - fee;
    }
}
