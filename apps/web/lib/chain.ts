import { bsc, bscTestnet, celo } from "viem/chains";

/** Celo Mainnet stays the default production chain (live track record). */
export const celoMainnet = celo;

/** BNB Chain (BSC) mainnet (56) and testnet (97) - additive multichain support. */
export const bscMainnet = bsc;
export { bscTestnet };

export const supportedChains = [celoMainnet, bscMainnet, bscTestnet] as const;

export type SupportedChainId = (typeof supportedChains)[number]["id"];

export const DEFAULT_CHAIN_ID: SupportedChainId = celoMainnet.id;

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
