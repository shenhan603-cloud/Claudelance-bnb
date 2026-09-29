/**
 * Live Claudelance deployment records. Celo mainnet (chain 42220) is the live,
 * default production deployment. BNB Chain entries (BSC mainnet 56 / BSC
 * testnet 97) are the multichain expansion - see the bottom of this file.
 *
 * Source of truth lives in `contracts/deployments/celo-mainnet.json`
 * within the monorepo; this module mirrors those records for npm consumers.
 *
 * UUPS upgradeable proxy, 10 task types, submitDeliverable, EIP-7201 storage.
 */

/**
 * The three whitelisted escrow-token slots. Keys keep their Celo names for
 * backwards compatibility; on other chains the slots map to
 * stable / wrapped-native / USDC (on BNB Chain: USDT / WBNB / USDC). Use
 * `Deployment.tokenSymbols` / `tokenDecimals` for display.
 */
export type TokenSet = {
  /** Celo Dollar stablecoin. */
  cUSD: `0x${string}`;
  /** CELO ERC20. */
  CELO: `0x${string}`;
  /** USDC. */
  USDC: `0x${string}`;
};

export type Deployment = {
  /** EVM chain id. */
  chainId: number;
  /** Human-readable chain name. */
  chainName: string;
  /** ClaudelanceCore v3 proxy address. */
  core: `0x${string}`;
  /** Implementation address behind the v3 UUPS proxy. */
  implementation?: `0x${string}`;
  /** Contract version (v3 UUPS proxy). */
  version: 'v3';
  /** Allowed escrow tokens at the time of deploy. Admin can `allowToken` more. */
  tokens: TokenSet;
  /** ERC-8004 Identity Registry (workers must hold an NFT here to claimSlot). */
  identityRegistry: `0x${string}`;
  /** ERC-8004 Reputation Registry (read for worker scores; feedback writes in Phase 2). */
  reputationRegistry: `0x${string}`;
  /** Owner address (EOA, multisig, or governance contract). */
  owner: `0x${string}`;
  /** Treasury - collects 2% protocol fee + forfeited stakes via pull pattern. */
  treasury: `0x${string}`;
  /** Relayer that signs `attestCI` calls. */
  ciRelayer: `0x${string}`;
  /** Explorer URL for the core contract (verified source page). */
  explorerUrl: string;
  /** Display symbol per token slot. Absent = Celo symbols (cUSD / CELO / USDC). */
  tokenSymbols?: Record<keyof TokenSet, string>;
  /** Decimals per token slot. Absent = Celo decimals (18 / 18 / 6). */
  tokenDecimals?: Record<keyof TokenSet, number>;
  /** Native gas token symbol. Absent = CELO. */
  nativeSymbol?: string;
  /** Block explorer base URL. Absent = https://celoscan.io */
  explorerBaseUrl?: string;
  /** False when the core proxy has not been deployed on this chain yet. */
  live?: boolean;
};

// ─── v3 (UUPS proxy, 10 task types) ──────────────────────────────────────────

export const MAINNET_V3: Deployment = {
  chainId: 42220,
  chainName: 'celo-mainnet',
  version: 'v3',
  core: '0x68c83D75Ee95860E83A893Aa13556AdE8411e3c8',
  implementation: '0x92b7d04E9A3fa3C96bfc891D8E8dB61Fe6C1D49C',
  tokens: {
    cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438',
    USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  },
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  owner: '0xe9Fc48f315fD4E989637fAcC29AaF2717E19f7F0',
  treasury: '0xCC0cCac212999612BdDdEb607B33CC1a46F8A401',
  ciRelayer: '0x1fEDda23c2945D59f3929e6C463cF685aC077ad5',
  explorerUrl: 'https://celoscan.io/address/0x68c83D75Ee95860E83A893Aa13556AdE8411e3c8#code',
};

// ─── Default exports - v3 is the current target ──────────────────────────────

/** Default Celo Mainnet deployment (v3 proxy). */
export const MAINNET: Deployment = MAINNET_V3;

// ─── BNB Chain (multichain expansion) ────────────────────────────────────────
//
// BSC testnet (97): ClaudelanceCore v3 deployed 2026-09-25 (mirrors
// contracts/deployments/bsc-testnet.json). TODO(bnb): BSC mainnet (56) is NOT
// deployed yet - `core` stays the zero address (`live: false`) there.
// Token slots: cUSD -> USDT, CELO -> WBNB, USDC -> USDC (all 18 decimals on BSC).
// ERC-8004 registries: reference CREATE2 deployments, bytecode confirmed on-chain.

const ZERO = '0x0000000000000000000000000000000000000000' as const;

const BSC_TOKEN_SYMBOLS = { cUSD: 'USDT', CELO: 'WBNB', USDC: 'USDC' } as const;
const BSC_TOKEN_DECIMALS = { cUSD: 18, CELO: 18, USDC: 18 } as const;

export const BSC_MAINNET_V3: Deployment = {
  chainId: 56,
  chainName: 'bsc-mainnet',
  version: 'v3',
  core: ZERO, // TODO(bnb): proxy address after deploy
  tokens: {
    cUSD: '0x55d398326f99059fF775485246999027B3197955', // USDT (BEP-20, 18 dec)
    CELO: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC (BEP-20, 18 dec)
  },
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  owner: ZERO, // TODO(bnb)
  treasury: ZERO, // TODO(bnb)
  ciRelayer: ZERO, // TODO(bnb)
  explorerUrl: 'https://bscscan.com',
  tokenSymbols: BSC_TOKEN_SYMBOLS,
  tokenDecimals: BSC_TOKEN_DECIMALS,
  nativeSymbol: 'BNB',
  explorerBaseUrl: 'https://bscscan.com',
  live: false,
};

export const BSC_TESTNET_V3: Deployment = {
  chainId: 97,
  chainName: 'bsc-testnet',
  version: 'v3',
  core: '0xD13958F9b62E912CEd21Ba351f8aFaecc1C733C5', // v3 proxy, deployed 2026-09-25 (block 132984885)
  implementation: '0xEB194356B798b81586B589e294b8b1b989895C63',
  tokens: {
    cUSD: '0x9200cABD0190EdC632691d58FB785e3A7272Ed1E', // MockERC20 "USDT" (18 dec) from DeployMocks.s.sol
    CELO: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB (canonical testnet)
    USDC: '0xb796355023580Fb29f7Be47460A0079B12aFd03e', // MockERC20 "USDC" (18 dec) from DeployMocks.s.sol
  },
  identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  owner: '0x3F46b654035aA92738FE4dC7dc9538Ca9bA07CEA',
  treasury: '0x3F46b654035aA92738FE4dC7dc9538Ca9bA07CEA',
  ciRelayer: '0x860DdD8fb4f4E3cA87854812444C45DcB74cb96e',
  explorerUrl: 'https://testnet.bscscan.com/address/0xD13958F9b62E912CEd21Ba351f8aFaecc1C733C5',
  tokenSymbols: BSC_TOKEN_SYMBOLS,
  tokenDecimals: BSC_TOKEN_DECIMALS,
  nativeSymbol: 'tBNB',
  explorerBaseUrl: 'https://testnet.bscscan.com',
  live: true,
};

/** Every known deployment, keyed by chain id. Celo mainnet first (default). */
export const DEPLOYMENTS: Record<number, Deployment> = {
  42220: MAINNET_V3,
  56: BSC_MAINNET_V3,
  97: BSC_TESTNET_V3,
};

/** Supported chain ids: Celo mainnet (default), BSC mainnet, BSC testnet. */
export const SUPPORTED_CHAIN_IDS = [42220, 56, 97] as const;

/** Look up the deployment by chain id (42220 Celo, 56 BSC, 97 BSC testnet). */
export function deploymentByChainId(chainId: number): Deployment | undefined {
  return DEPLOYMENTS[chainId];
}
