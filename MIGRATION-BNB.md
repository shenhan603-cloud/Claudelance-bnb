# Claudelance: multichain expansion to BNB Chain

Claudelance stays **live on Celo mainnet**. The Celo v3 core, the ERC-8004
identity and reputation records, bounties, transaction history, MiniPay support,
Celoscan proof links and the cUSD / CELO / USDC tokens are all unchanged, and
Celo is still the default chain everywhere. This expansion adds **BNB Chain**:
BSC testnet (97) as the first BSC target, and BSC mainnet (56).

## What was added

### Contracts (`contracts/`)
- `foundry.toml`: added `bsc_testnet` / `bsc` RPC endpoints and Etherscan V2 verify entries.
- `script/DeployV3.s.sol`: on BSC, the three token slots map to USDT / WBNB / USDC.
  - It accepts `USDT_ADDRESS` / `WBNB_ADDRESS` env aliases. On chain 56 it falls back to the canonical addresses.
  - Minimum bounties are 18-decimal: 0.5 USDT, 0.001 WBNB, 0.5 USDC.
  - The mainnet key-separation rule and the Safe-only `allowToken` rule now cover chain 56 too.
- `script/Deploy.s.sol`: counts chain 56 as a mainnet and uses the BSC USDC decimals (18).
- `script/DeployMocks.s.sol`: on chain 97 it deploys USDT / WBNB / USDC mocks (18 decimals). Both mock scripts refuse to run on chain 56.
- `deployments/bsc-testnet.json` and `deployments/bsc-mainnet.json`: placeholders marked `NOT_DEPLOYED`.
- `.env.example` and `README.md` gained a BSC section.
- The contract sources did not change.

### Packages
- `packages/types`: new optional `Deployment` fields: `tokenSymbols`, `tokenDecimals`, `nativeSymbol`, `explorerBaseUrl` and `live`.
  - New exports: `BSC_MAINNET_V3`, `BSC_TESTNET_V3` (core is the zero address, `live: false`), `DEPLOYMENTS`, `SUPPORTED_CHAIN_IDS`.
  - `deploymentByChainId` now handles 56 and 97, and returns the same as before for 42220.
  - The `TokenSet` keys stay `cUSD` / `CELO` / `USDC` for compatibility. On BSC those slots hold USDT / WBNB / USDC.
- `packages/sdk`: `NetworkKey` gains `'bsc' | 'bscTestnet'`.
  - New exports: `bscMainnet`, `bscTestnet`, `networkForChainId`, `deploymentForNetwork` and `NETWORK_META` (symbols, decimals and explorer per network).
  - Clients take an optional `coreAddress`. `fromEnv` reads `CLAUDELANCE_CORE_ADDRESS` and `BSC_RPC_URL`.
  - All existing exports and Celo behavior are unchanged.
- The package.json files and `.claude-plugin/*.json` now carry `bnb-chain` / `bsc` keywords and "Celo and BNB Chain" wording.

### Apps
- `apps/relayer`: `RELAYER_NETWORK=bsc|bscTestnet` or `CHAIN_ID=56|97` selects BSC.
  - New env vars: `CORE_ADDRESS`, `KEEPER_MIN_BALANCE_NATIVE`.
  - On BSC, `EVENTS_FROM_BLOCK` and `IDENTITY_EVENTS_FROM_BLOCK` are required.
  - Anything else, including the old values, still means Celo.
- `apps/web`: wagmi / RainbowKit chains are `[celo, bsc, bscTestnet]`, with Celo as `DEFAULT_CHAIN_ID`.
  - A network button next to the wallet button opens the chain switcher. It is hidden inside MiniPay.
  - Explorer helpers take a `chainId`: Celoscan by default, BscScan on 56 / 97.
  - `lib/contracts.ts` has a new `bscDeployments`. `walletTokensFor(chainId)` returns the BSC token set (18 decimals) and there is a new WBNB badge.
  - The profile send and asset views follow the connected chain. The Celo gas-token option and MiniPay Add Cash are hidden on BSC.
  - Bounty detail reads and writes are pinned to Celo, where the live bounties are.
  - Copy now says "Live on Celo, now also on BNB Chain": hero, metadata, About, `llms*.txt`.
  - BSC vars were added to `.env.example`.
- `apps/coworking-api`: unchanged. It is off-chain.

### Docs
- Root README: a "Live on Celo, now also on BNB Chain" note and a BSC deployments table.
- `CLAUDE.md`: a BSC section.
- The sdk and types READMEs have BSC rows.
- The historical docs in `docs/` were left as they are.

## Addresses checked (read-only RPC calls)
- BSC mainnet tokens, all 18 decimals: USDT `0x55d398326f99059fF775485246999027B3197955`, USDC `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`, WBNB `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`.
- BSC testnet: WBNB `0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd`.
- The ERC-8004 Identity and Reputation registries are deployed on BSC 56 and 97, and the SDK / types reference those addresses.
- Multicall3 is present on both BSC networks.

## Deploy to BSC testnet (not executed)

```sh
cd contracts
# .env: deployer / owner / treasury / relayer keys, ETHERSCAN_API_KEY, BSC_TESTNET_RPC (see .env.example)
source .env
forge script script/DeployMocks.s.sol --rpc-url bsc_testnet --broadcast        # USDT/WBNB/USDC mocks, 18 dec
forge script script/DeployV3.s.sol   --rpc-url bsc_testnet --broadcast --verify
```

After the deploy:
1. Fill `core`, the implementation, the roles and the mock token addresses in `packages/types/src/deployments.ts` (`BSC_TESTNET_V3`) and in `deployments/bsc-testnet.json`.
2. Set `NEXT_PUBLIC_BSC_TESTNET_*` in `apps/web`.
3. Run the relayer with `CHAIN_ID=97`, `CORE_ADDRESS`, `EVENTS_FROM_BLOCK` and `IDENTITY_EVENTS_FROM_BLOCK`.
4. Rebuild and republish the `types` and `sdk` packages.

## TODO
- Deploy to BSC testnet, then mainnet. On mainnet, `allowToken` goes through a Safe on BSC.
- Fill in the BSC addresses in types, deployments JSON and web env.
- Set the relayer scan-floor blocks. Pass the proxy's deploy block to `TokenManager` on BSC, because its default start block is specific to Celo.
- Web: server-side reads (stats, bounties feed, revenue, workers) and posting a bounty are still Celo-only. A BSC bounty feed needs per-chain API routes.
- When the wallet is on BSC, the bounty detail page makes users switch to Celo by hand, and the error can be swallowed.
- The operator scripts (`scripts/`, `scripts/legacy/`, `claudelance worker/`) and `packages/worker` stay Celo-only.

## Verification
- `forge build` succeeded. `forge test` on `test/ClaudelanceCore.t.sol` passed 79/79. The other suites were not run.
- `packages/sdk` (with the types resolved from source) and the relayer's `config.ts` / `chain.ts` passed strict `tsc`. The rest of the relayer and the worker / coworking packages were not checked.
- `apps/web` passed `tsc --noEmit` with the workspace packages mapped to source, after a temporary `pnpm install`. `node_modules` was removed afterwards.
