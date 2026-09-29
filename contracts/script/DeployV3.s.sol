// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { ClaudelanceCoreV3 } from "../src/v3/ClaudelanceCoreV3.sol";
import { ClaudelanceProxy } from "../src/v3/ClaudelanceProxy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { TypeConfig } from "../src/v3/types/ClaudelanceTypes.sol";
import { TaskTypeLib } from "../src/v3/libraries/TaskTypeLib.sol";

/// @notice Deploys ClaudelanceCoreV3 + ClaudelanceProxy, initializes, and
///         whitelists cUSD / CELO / USDC.
///
/// Required env vars (both networks):
///   TREASURY_ADDRESS, CI_RELAYER_ADDRESS, OWNER_ADDRESS
///   IDENTITY_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ADDRESS
///   CUSD_ADDRESS, CELO_ADDRESS, USDC_ADDRESS
///   (min bounty amounts default to 0.5 / 1.0 / 0.5 tokens)
///
/// Mainnet only:
///   ALLOW_SHARED_ADMIN_WALLETS must NOT be set (or set to false)
///   - Deploy.s.sol enforces 4-key separation on chainid 42220 / 56.
///
/// Multichain (BNB Chain, chainid 56 / 97):
///   The three token slots map to stable / wrapped-native / USDC:
///     CUSD_ADDRESS -> USDT, CELO_ADDRESS -> WBNB, USDC_ADDRESS -> USDC
///   (USDT_ADDRESS / WBNB_ADDRESS are accepted as BSC-friendly aliases).
///   On BSC mainnet the canonical USDT / WBNB / USDC addresses are used when
///   the env vars are unset. All three are 18 decimals on BSC.
///   On BSC testnet deploy mocks first (DeployMocks.s.sol) and set the env vars.
contract DeployV3 is Script {
    // ── Min bounty floors ──
    // Celo: 18 decimals for cUSD/CELO, 6 for USDC.
    // BSC:  18 decimals for USDT/WBNB/USDC.
    uint256 constant MIN_CUSD = 0.5e18;
    uint256 constant MIN_CELO = 1e18;
    uint256 constant MIN_USDC = 0.5e6;
    uint256 constant MIN_BSC_STABLE = 0.5e18;
    uint256 constant MIN_WBNB = 0.001e18;

    // BSC mainnet canonical tokens (verified on bscscan, 18 decimals each)
    address constant BSC_USDT = 0x55d398326f99059fF775485246999027B3197955;
    address constant BSC_WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address constant BSC_USDC = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;

    function _isBsc() internal view returns (bool) {
        return block.chainid == 56 || block.chainid == 97;
    }

    function _isMainnet() internal view returns (bool) {
        return block.chainid == 42220 || block.chainid == 56;
    }

    /// @dev Celo: required env var. BSC: alias env var, then primary env var,
    ///      then the canonical mainnet default (chainid 56 only).
    function _token(string memory key, string memory bscAlias, address bscMainnetDefault)
        internal
        view
        returns (address)
    {
        if (!_isBsc()) return vm.envAddress(key);
        address a = vm.envOr(bscAlias, address(0));
        if (a == address(0)) a = vm.envOr(key, address(0));
        if (a == address(0) && block.chainid == 56) a = bscMainnetDefault;
        require(a != address(0), string.concat("DeployV3: missing ", bscAlias, " / ", key));
        return a;
    }

    function run() external {
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address ciRelayer = vm.envAddress("CI_RELAYER_ADDRESS");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address identityReg = vm.envAddress("IDENTITY_REGISTRY_ADDRESS");
        address reputationReg = vm.envAddress("REPUTATION_REGISTRY_ADDRESS");
        address cusd = _token("CUSD_ADDRESS", "USDT_ADDRESS", BSC_USDT);
        address celo = _token("CELO_ADDRESS", "WBNB_ADDRESS", BSC_WBNB);
        address usdc = _token("USDC_ADDRESS", "USDC_ADDRESS", BSC_USDC);

        bool allowShared = vm.envOr("ALLOW_SHARED_ADMIN_WALLETS", false);

        // On mainnet, enforce 4-key separation to prevent single-key compromise
        if (_isMainnet() && !allowShared) {
            address deployer = msg.sender;
            require(deployer != owner, "DeployV3: deployer == owner");
            require(deployer != treasury, "DeployV3: deployer == treasury");
            require(deployer != ciRelayer, "DeployV3: deployer == ciRelayer");
            require(owner != treasury, "DeployV3: owner == treasury");
            require(owner != ciRelayer, "DeployV3: owner == ciRelayer");
            require(treasury != ciRelayer, "DeployV3: treasury == ciRelayer");
        }

        vm.startBroadcast();

        // 1. Deploy implementation (initializers disabled in constructor)
        ClaudelanceCoreV3 impl = new ClaudelanceCoreV3();
        console2.log("Implementation:", address(impl));

        // 2. Encode initialize() call for proxy constructor
        bytes memory initData = abi.encodeCall(
            ClaudelanceCoreV3.initialize,
            (treasury, ciRelayer, owner, identityReg, reputationReg)
        );

        // 3. Deploy proxy - calls initialize() atomically
        ClaudelanceProxy proxy = new ClaudelanceProxy(address(impl), initData);
        console2.log("Proxy (ClaudelanceCoreV3):", address(proxy));

        // 4. Whitelist tokens via the proxy
        // Note: on mainnet, the owner is a Safe multisig so these calls
        // must be submitted separately through the Safe UI after deploy.
        // On Sepolia (single key), we can do it here.
        if (!_isMainnet()) {
            ClaudelanceCoreV3 core = ClaudelanceCoreV3(address(proxy));
            bool bsc = _isBsc();
            core.allowToken(IERC20(cusd), bsc ? MIN_BSC_STABLE : MIN_CUSD);
            console2.log(bsc ? "allowToken: USDT" : "allowToken: cUSD");
            core.allowToken(IERC20(celo), bsc ? MIN_WBNB : MIN_CELO);
            console2.log(bsc ? "allowToken: WBNB" : "allowToken: CELO");
            core.allowToken(IERC20(usdc), bsc ? MIN_BSC_STABLE : MIN_USDC);
            console2.log("allowToken: USDC");
        } else {
            console2.log("Mainnet: run allowToken through Safe multisig after deploy.");
        }

        vm.stopBroadcast();

        // 5. Write deployment record
        string memory chain = block.chainid == 42220
            ? "celo-mainnet-v3"
            : block.chainid == 56 ? "bsc-mainnet-v3" : block.chainid == 97 ? "bsc-testnet-v3" : "celo-sepolia-v3";
        console2.log("Chain:", chain);
        console2.log("Proxy address (save this):", address(proxy));
        console2.log("Implementation:", address(impl));
    }
}
