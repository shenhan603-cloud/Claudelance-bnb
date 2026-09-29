import { createPublicClient, http, type PublicClient } from "viem";
import { bsc, bscTestnet, celo } from "viem/chains";

/** Celo Mainnet stays the default production chain (live track record). */
export const celoMainnet = celo;

/** BNB Chain (BSC) mainnet (56) and testnet (97) - additive multichain support. */
export const bscMainnet = bsc;
export { bscTestnet };

export const supportedChains = [celoMainnet, bscMainnet, bscTestnet] as const;

export type SupportedChainId = (typeof supportedChains)[number]["id"];

export const DEFAULT_CHAIN_ID: SupportedChainId = celoMainnet.id;

/** Chain ids with a live ClaudelanceCore deployment (BSC mainnet 56 pending). */
export const LIVE_CHAIN_IDS = [celoMainnet.id, bscTestnet.id] as const;

export function isLiveChain(id: number | undefined): boolean {
  return (LIVE_CHAIN_IDS as readonly number[]).includes(id ?? DEFAULT_CHAIN_ID);
}

/** Optional RPC endpoint overrides per chain id (server + client env). */
const rpcOverrides: Partial<Record<number, string>> = {
  [celoMainnet.id]: process.env.NEXT_PUBLIC_CELO_MAINNET_RPC,
  [bscMainnet.id]: process.env.NEXT_PUBLIC_BSC_RPC_URL,
  [bscTestnet.id]: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL,
};

/** Public viem client for any supported chain, honoring RPC env overrides. */
export function publicClientFor(chainId: number): PublicClient {
  const chain = chainById(chainId);
  if (!chain) throw new Error(`Unsupported chain id ${chainId}`);
  const rpc = rpcOverrides[chainId] ?? chain.rpcUrls.default.http[0];
  // The chain union makes viem infer per-chain generics that don't unify;
  // erase to the broad PublicClient shape expected by call sites.
  return createPublicClient({ chain, transport: http(rpc) }) as unknown as PublicClient;
}

export function chainById(id: number) {
  return supportedChains.find((c) => c.id === id);
}

export function isBscChain(id: number | undefined): boolean {
  return id === bscMainnet.id || id === bscTestnet.id;
}

/** Native gas token symbol for a chain (CELO on Celo, BNB on BNB Chain). */
export function nativeSymbol(id: number | undefined): string {
  return chainById(id ?? DEFAULT_CHAIN_ID)?.nativeCurrency.symbol ?? "CELO";
}

/** Primary stablecoin label per chain: cUSD on Celo, USDT (18 decimals) on BSC. */
export function stableSymbol(id: number | undefined): string {
  return isBscChain(id) ? "USDT" : "cUSD";
}

/** Block explorer base URL for a chain (celoscan / bscscan). */
export function explorerBase(id: number | undefined): string {
  const url = chainById(id ?? DEFAULT_CHAIN_ID)?.blockExplorers?.default.url ?? "https://celoscan.io";
  return url.replace(/\/$/, "");
}
