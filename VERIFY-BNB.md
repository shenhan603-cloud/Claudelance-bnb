# Claudelance: BNB Chain verification

Date: 2026-09-25. Method: a local anvil fork of BSC testnet (chain 97), using the real ERC-8004 registries on that chain and anvil's public test accounts. Nothing was written to a real network.

**Verdict: works on the BSC fork for the contracts, the SDK and the relayer. The web app builds and serves for both chains; BSC support in the UI covers only the wallet and assets views, by design. The Celo path is intact and is still the default.**

| Check | Result | Notes |
|---|---|---|
| `forge build` | PASS | |
| `forge test` (all suites) | PASS | 115 passed, 1 skipped, 0 failed. The suites are ClaudelanceCore (79), V3 (32) and invariants (4). |
| Fork deploy | PASS | `DeployMocks.s.sol` on chain 97 deployed Mock USDT, WBNB and USDC, all 18 decimals. `DeployV3.s.sol` deployed the proxy and implementation (v3.1.0) with the aliases `USDT_ADDRESS`, `WBNB_ADDRESS=0xae13…a7cd` (real testnet WBNB) and `USDC_ADDRESS`, and called `allowToken` for all three with the BSC minimums. |
| Core flow (cast) | PASS | The worker registered an ERC-8004 identity on the real BSC testnet IdentityRegistry `0x8004A818…` (agentId 2472). Then: postBounty (USDT, CI required), claimSlot (stake pulled), submitDeliverable, attestCI (a non-relayer call reverts, the relayer call succeeds), pickWinner, settleStake and withdrawEarnings. The worker received 0.98 + 0.1 stake. `attestReputation` wrote to the real ReputationRegistry. A WBNB bounty was also posted, and the minimum-bounty check works (0.0005 WBNB reverts). |
| SDK (`packages/sdk`, built) | PASS | `fromPrivateKey({network:'bscTestnet', coreAddress})` reads bounties, stats and identity, and `postBountyWithApproval` (WBNB) succeeds. `deploymentForNetwork('bscTestnet')` throws without an override, as designed. `fromRpcUrl({network:'celo'})` still resolves the live Celo core `0x68c8…e3c8` (261 bounties). |
| Relayer on BSC (CHAIN_ID=97, DRY_RUN=false) | PASS after a fix | `/health` and `/` are OK. The keeper auto-ran `settleStake` and `attestReputation` for a resolved bounty. A signed GitHub `workflow_run` webhook matched the PR deliverable and sent `attestCI` (CIAttested emitted). A bad signature returns 401. |
| Relayer on Celo (default, DRY_RUN) | PASS | Network is `celo` and core is the live proxy. A keeper tick scanned 261 bounties and computed 53 dry-run actions with 0 failures. |
| Typecheck | PASS | types, sdk, coworking-types, coworking-sdk, relayer, web, coworking-api |
| Unit tests | PASS | relayer 47/47, web 4/4, coworking-api 18/18 |
| Web build + run, Celo default | PASS | On :3105, `/`, `/bounties`, `/bounty/1` and `/revenue` return 200 with Celoscan links and no BscScan. |
| Web build + run with BSC testnet env | PASS | The fork RPC, core and USDT addresses are in the bundle. `/`, `/bounties`, `/bounty/1`, `/profile`, `/post`, `/workers`, `/revenue`, `/about`, `/docs`, `/api/swarm` and `/llms.txt` return 200 with no chain-mismatch text. The in-wallet chain switch was not browser-tested. |
| Real-network address checks | PASS | On BSC mainnet: USDT, USDC and WBNB all have 18 decimals. On BSC testnet, WBNB is OK. The ERC-8004 Identity registry (`AgentIdentity` v2.0.0) and Reputation registry (v2.0.0, `getIdentityRegistry` links correctly) have code on both 56 and 97. Multicall3 is present on 56 and 97. |

## Bugs fixed
1. **`apps/relayer/src/chain.ts` `findAgentIdByOwner`** used 250k-block `eth_getLogs` windows. The BSC public RPCs cap the range at 50k (publicnode) or reject `eth_getLogs` entirely (bnbchain data-seed). The error was swallowed, so on BSC the keeper logged `agent-unresolvable` and **never ran `attestReputation`**. Windows are now 50k on non-Celo chains (with up to 1000 of them); Celo stays at 250k. Verified: after restarting, the keeper attested the pending bounty.
2. `apps/relayer/.env.example`: the suggested BSC RPCs (data-seed / bsc-dataseed) reject `eth_getLogs`, and viem's default for bscTestnet is the same data-seed host. The file now says that `RELAYER_RPC_URL` must be a provider that supports `eth_getLogs` (publicnode for testnet, a paid or archive provider for mainnet).
3. `apps/web/lib/contracts.ts`: added the canonical testnet WBNB to `bscDeployments[97]`. Before this, the asset list on BSC testnet had no WBNB.

## Known gaps (from MIGRATION-BNB.md, confirmed)
- In the web app, bounty feed, stats, posting and bounty detail are Celo-only. On BSC only the wallet and assets views work.
- With `coreAddress` overridden on `bscTestnet`, the SDK still has `tokens.cUSD` and `tokens.USDC` as the zero address until `BSC_TESTNET_V3` is filled in. `getBalances` and `approveAllTokens` would hit address 0. Fill in the types after the deploy.
- `pnpm-lock.yaml` gained a `packages/worker: {}` importer compared with the original. It is harmless.

## Steps remaining for a real BSC testnet deploy
1. Prepare separate keys for deployer, owner, treasury and CI relayer. Fund the deployer with about 0.05 tBNB (mocks plus V3 are roughly 10M gas, about 0.01 tBNB at 1 gwei) and the relayer with about 0.02 tBNB for gas.
2. In `contracts/.env`, set `TREASURY_ADDRESS`, `CI_RELAYER_ADDRESS`, `OWNER_ADDRESS`, `IDENTITY_REGISTRY_ADDRESS=0x8004A818BFB912233c491871b3d84c89A494BD9e`, `REPUTATION_REGISTRY_ADDRESS=0x8004B663056A597Dffe9eCcC1965A193B7388713`, `BSC_TESTNET_RPC` and `ETHERSCAN_API_KEY`.
3. Run `forge script script/DeployMocks.s.sol --rpc-url bsc_testnet --broadcast`. Then set `USDT_ADDRESS` and `USDC_ADDRESS` from its output, and `WBNB_ADDRESS=0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd` or the mock.
4. Run `forge script script/DeployV3.s.sol --rpc-url bsc_testnet --broadcast --verify`.
5. Fill in `packages/types/src/deployments.ts` `BSC_TESTNET_V3` (core, implementation, tokens, roles, `live: true`) and `deployments/bsc-testnet.json`. Rebuild and publish types and sdk.
6. Relayer: set `CHAIN_ID=97`, `CORE_ADDRESS`, `RELAYER_RPC_URL=https://bsc-testnet-rpc.publicnode.com`, `EVENTS_FROM_BLOCK` (the proxy's deploy block), `IDENTITY_EVENTS_FROM_BLOCK`, `RELAYER_PRIVATE_KEY` (the CI relayer key), `DRY_RUN=false` and `GITHUB_WEBHOOK_SECRET`.
7. Web: set `NEXT_PUBLIC_BSC_TESTNET_CORE_ADDRESS`, `NEXT_PUBLIC_BSC_TESTNET_USDT_ADDRESS` and `NEXT_PUBLIC_BSC_TESTNET_RPC_URL`.

## Real BSC Testnet deploy (2026-09-25)

Deployed on the real BSC testnet (chain 97) with `script/DeployMocks.s.sol` and then `script/DeployV3.s.sol` (`--rpc-url bsc_testnet`, RPC `https://bsc-testnet-rpc.publicnode.com`, gas price 0.1 gwei). The contracts are **not verified** on BscScan, because no `ETHERSCAN_API_KEY` was available.

Roles:
- Deployer, owner and treasury: the group wallet `0x3F46b654035aA92738FE4dC7dc9538Ca9bA07CEA`.
- CI relayer: a new wallet `0x860DdD8fb4f4E3cA87854812444C45DcB74cb96e`.
- Test worker: a new wallet `0x199C32c75865117e0a8E4e94E67CA28279a9FFc7`.

The relayer and worker wallets were each funded with 0.003 tBNB. Their keys are kept outside the repo.

| Contract | Address |
|---|---|
| ClaudelanceCoreV3 proxy (`version()` = 3.1.0) | [`0xD13958F9b62E912CEd21Ba351f8aFaecc1C733C5`](https://testnet.bscscan.com/address/0xD13958F9b62E912CEd21Ba351f8aFaecc1C733C5) |
| ClaudelanceCoreV3 implementation | [`0xEB194356B798b81586B589e294b8b1b989895C63`](https://testnet.bscscan.com/address/0xEB194356B798b81586B589e294b8b1b989895C63) |
| Mock USDT (18 dec), cUSD slot | [`0x9200cABD0190EdC632691d58FB785e3A7272Ed1E`](https://testnet.bscscan.com/address/0x9200cABD0190EdC632691d58FB785e3A7272Ed1E) |
| WBNB (canonical testnet), CELO slot | [`0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd`](https://testnet.bscscan.com/address/0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd) |
| Mock USDC (18 dec), USDC slot | [`0xb796355023580Fb29f7Be47460A0079B12aFd03e`](https://testnet.bscscan.com/address/0xb796355023580Fb29f7Be47460A0079B12aFd03e) |
| Mock WBNB (deployed by DeployMocks, not whitelisted) | [`0x3F3804Af6303e4a7fE4394B55A4422630d0be518`](https://testnet.bscscan.com/address/0x3F3804Af6303e4a7fE4394B55A4422630d0be518) |
| ERC-8004 Identity / Reputation (existing) | `0x8004A818…BD9e` / `0x8004B663…8713` |

The proxy deploy block is 132984885.

Deploy transactions:
- Implementation: [`0x78b61ad9…`](https://testnet.bscscan.com/tx/0x78b61ad9f94530be3eb98301b713135c75101599b5e9f17fcdf407e191670173)
- Proxy: [`0x3f213abc…`](https://testnet.bscscan.com/tx/0x3f213abc085c8197abe0b0f5ba2d05ec579991dcaf5e2297a13d29a49a0a0d32)
- allowToken for USDT, WBNB and USDC: [`0x01a91138…`](https://testnet.bscscan.com/tx/0x01a91138c4bb73f6b27da9c3f94185d2a7d41ac3662586f6d8e89943cb02ae53), [`0x3846c671…`](https://testnet.bscscan.com/tx/0x3846c671ba4d29553193c4704ccfbebe81089f43077f173df50d4cff693992ab), [`0x680a0745…`](https://testnet.bscscan.com/tx/0x680a074516f747dc52c6b5e1e4cf2085f03e3a05b6709fadc10ed6e641e12fe2)

Smoke flow on the real testnet, run with cast. Every receipt has status 1.

| Step | Tx | Result |
|---|---|---|
| Worker `register()` on the ERC-8004 IdentityRegistry | [`0x6c28d547…`](https://testnet.bscscan.com/tx/0x6c28d54784d14582fd32d40997850ed43b31f4cb14489bb5e43f5adedefa4ed5) | agentId **2474** |
| Poster approve + `postBounty(USDT, type 0 code, 1 USDT, 1 slot, stake 0.1, 1 day, ciRequired)` | [`0xc9e15397…`](https://testnet.bscscan.com/tx/0xc9e153973799714f2a2c8de15640656e0b87001fb8dc8b2ee87aa56f2496bce2) / [`0x3b0f571b…`](https://testnet.bscscan.com/tx/0x3b0f571b4a686dee600091a78759c7e1bfa745980f2a133d26a8ef3a7b20d179) | bounty #1 |
| Worker approve + `claimSlot(1)` | [`0x0242d9c8…`](https://testnet.bscscan.com/tx/0x0242d9c84bf3575ca20447adc3bdd9fa01dd40dad8178cb894537897b46c6063) / [`0x270c4b7c…`](https://testnet.bscscan.com/tx/0x270c4b7cb463cea938a7d218a8d6373dcf764f151d5213dcd262653e8c5c027e) | 0.1 USDT stake pulled |
| `submitDeliverable` | [`0x6212ca9b…`](https://testnet.bscscan.com/tx/0x6212ca9b5f7167e391074e5c6db4b0b54be2f1fd3588239605af9c4580d4902b) | ok |
| `attestCI` from a non-relayer (eth_call) | n/a | Reverts with `0xc64891a5` (only the relayer may call it) |
| `attestCI(1, worker, true)` from the relayer | [`0xb2bc1743…`](https://testnet.bscscan.com/tx/0xb2bc174395cad7924bf43c4aecb55f7d6bbf9f1d490194ad58f1bd759e2634dc) | ok |
| `pickWinner(1, worker)` | [`0x6c4730c4…`](https://testnet.bscscan.com/tx/0x6c4730c4aef912b92794ed0beac66470332191e0a8fdff715f875332ec267abb) | 0.98 to the worker, 0.02 fee to the treasury |
| `settleStake(1, worker)` | [`0xb5014395…`](https://testnet.bscscan.com/tx/0xb50143958927cacb808f4eb6844b0d98c7cc4c960e7cf8babebf7510fcc4340c) | Stake returned |
| Worker `withdrawEarnings(USDT)` | [`0xaa9d4da3…`](https://testnet.bscscan.com/tx/0xaa9d4da3a3bdb64ec0814ffe49c466b51365c15d75e89c1ff8c89e9a951c2691) | Worker USDT went from 2 to 2.98 |
| `attestReputation(1, 2474)` | [`0xd51fb24a…`](https://testnet.bscscan.com/tx/0xd51fb24aff595ab38716d9a90b8f0b7344c34a43446da3729743920b4a4ad29e) | `giveFeedback` on the real ReputationRegistry. `isReputationAttested(1)` returns true. |

Gas spent: about 0.00082 tBNB in total (group wallet about 0.00076, worker about 0.00006, relayer about 0.000004). The 0.006 tBNB sent to the relayer and worker wallets is mostly unspent.

Filled in with the real addresses:
- `packages/types/src/deployments.ts` `BSC_TESTNET_V3`: core, implementation, tokens, owner, treasury and ciRelayer, with `live: true`. `BSC_MAINNET_V3` and `MAINNET_V3` (Celo) were not touched.
- `apps/relayer/src/config.ts`: the `bscTestnet` events floor is now 132984885.
- `contracts/deployments/bsc-testnet.json`.
- `apps/web/.env.bsc-testnet` and `apps/relayer/.env.bsc-testnet` (addresses only).
- The root README table, the types and sdk READMEs, and `CLAUDE.md`.

Checks:
- SDK (rebuilt): `deploymentForNetwork('bscTestnet')` now resolves the core without an override. `ClaudelanceClient.fromRpcUrl({network:'bscTestnet'})` reads bounty #1 (status Resolved, winner = worker), a bounty count of 1, and the worker balances (2.98 USDT). `deploymentForNetwork('celo')` still returns `0x68c8…e3c8`.
- Typecheck: `tsc --noEmit` passes for the relayer and types.
- Web: built with `apps/web/.env.bsc-testnet`, then `next start` on :3102. `/`, `/bounties`, `/bounty/1`, `/profile`, `/post`, `/workers`, `/revenue`, `/about`, `/docs`, `/api/swarm` and `/llms.txt` all return 200. The core and USDT addresses are in the client bundle. The home page still shows the Celo core and Celoscan links, so Celo is still the default. The server was stopped, and `node_modules` and `.next` were removed.

**Works live:** the full bounty lifecycle (post, claim, submit, CI attest, pick winner, settle stake, withdraw) and the ERC-8004 reputation write on BSC testnet.

**Left to do:**
- BscScan verification (needs an API key).
- `IDENTITY_EVENTS_FROM_BLOCK` for the BSC testnet relayer is still blank, because the registry deploy block is unknown.
- The relayer service was not run live.
- The web bounty feed and posting are still Celo-only, as before.
- Publishing new types and sdk versions.
- BSC mainnet.
- $LANCE is not whitelisted on this core. It is not needed for the flow, and the BSC LANCE is `0x56a6…1bf9` if it is wanted.
