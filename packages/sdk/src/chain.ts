import { defineChain } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import {
  MAINNET,
  BSC_MAINNET_V3,
  BSC_TESTNET_V3,
  type Deployment,
} from '@yeheskieltame/claudelance-types';

/**
 * viem chain definition for Celo Mainnet.
 */
export const celoMainnet = defineChain({
  id: 42_220,
  name: 'Celo',
  network: 'celo',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo.org'] },
    public: { http: ['https://forno.celo.org'] },
  },
  blockExplorers: {
    default: { name: 'Celoscan', url: 'https://celoscan.io' },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 13_112_599,
    },
  },
});

/** viem chain definition for BNB Smart Chain mainnet (chain 56). */
export const bscMainnet = bsc;
/** viem chain definition for BNB Smart Chain testnet (chain 97). */
export { bscTestnet };

/**
 * Friendly network key accepted by SDK factories.
 * - `'celo'` (alias `'mainnet'`): Celo Mainnet 42220 - the live default.
 * - `'bsc'`: BNB Smart Chain mainnet 56.
 * - `'bscTestnet'`: BNB Smart Chain testnet 97.
 */
export type NetworkKey = 'celo' | 'mainnet' | 'bsc' | 'bscTestnet';

export function chainForNetwork(network: NetworkKey) {
  if (network === 'celo' || network === 'mainnet') return celoMainnet;
  if (network === 'bsc') return bscMainnet;
  if (network === 'bscTestnet') return bscTestnet;
  throw new Error(`[chainForNetwork] Unknown network: ${network as string}`);
}

/** Map a chain id (42220 / 56 / 97) to its network key. */
export function networkForChainId(chainId: number): NetworkKey | undefined {
  if (chainId === 42_220) return 'celo';
  if (chainId === 56) return 'bsc';
  if (chainId === 97) return 'bscTestnet';
  return undefined;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Resolve the Claudelance deployment for a network. Celo returns the live
 * mainnet record unchanged. `coreOverride` swaps in a proxy address (useful
 * for BNB Chain before the canonical records are filled in).
 */
export function deploymentForNetwork(network: NetworkKey, coreOverride?: `0x${string}`): Deployment {
  const base =
    network === 'bsc' ? BSC_MAINNET_V3 : network === 'bscTestnet' ? BSC_TESTNET_V3 : MAINNET;
  const d: Deployment = coreOverride ? { ...base, core: coreOverride, live: true } : base;
  if (d.core === ZERO_ADDRESS) {
    throw new Error(
      `[deploymentForNetwork] Claudelance is not deployed on ${network} yet. ` +
        'Pass coreAddress / CLAUDELANCE_CORE_ADDRESS with your proxy address.',
    );
  }
  return d;
}

/** Display metadata per network: native gas symbol, token slot symbols/decimals, explorer. */
export type NetworkMeta = {
  chainId: number;
  nativeSymbol: string;
  explorer: string;
  tokenSymbols: { cUSD: string; CELO: string; USDC: string };
  tokenDecimals: { cUSD: number; CELO: number; USDC: number };
};

export const NETWORK_META: Record<'celo' | 'bsc' | 'bscTestnet', NetworkMeta> = {
  celo: {
    chainId: 42_220,
    nativeSymbol: 'CELO',
    explorer: 'https://celoscan.io',
    tokenSymbols: { cUSD: 'cUSD', CELO: 'CELO', USDC: 'USDC' },
    tokenDecimals: { cUSD: 18, CELO: 18, USDC: 6 },
  },
  bsc: {
    chainId: 56,
    nativeSymbol: 'BNB',
    explorer: 'https://bscscan.com',
    tokenSymbols: { cUSD: 'USDT', CELO: 'WBNB', USDC: 'USDC' },
    tokenDecimals: { cUSD: 18, CELO: 18, USDC: 18 },
  },
  bscTestnet: {
    chainId: 97,
    nativeSymbol: 'tBNB',
    explorer: 'https://testnet.bscscan.com',
    tokenSymbols: { cUSD: 'USDT', CELO: 'WBNB', USDC: 'USDC' },
    tokenDecimals: { cUSD: 18, CELO: 18, USDC: 18 },
  },
};
