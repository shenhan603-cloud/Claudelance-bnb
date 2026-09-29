import type { Address } from "viem";
import { MAINNET_V3 } from "@yeheskieltame/claudelance-types";

import { type TokenSymbol, USDT_ADDRESS } from "@/lib/token-theme";
import { bscDeployments } from "@/lib/contracts";
import { isBscChain } from "@/lib/chain";

export type TokenMeta = {
  symbol: TokenSymbol;
  address: Address;
  decimals: number;
  /** Short human label for the asset row. */
  name: string;
};

/**
 * The wallet-facing token set for the connected user (asset list + send form).
 * Decimals: USDC and USDT are 6, cUSD/CELO are 18. CELO is an ERC-20 on Celo, so
 * a plain ERC-20 `transfer` moves all of them uniformly. USDT is wallet-only (not
 * a Claudelance bounty token); it is here so funds can move in/out of MiniPay.
 */
export const WALLET_TOKENS: readonly TokenMeta[] = [
  { symbol: "cUSD", address: MAINNET_V3.tokens.cUSD as Address, decimals: 18, name: "Celo Dollar" },
  { symbol: "CELO", address: MAINNET_V3.tokens.CELO as Address, decimals: 18, name: "Celo" },
  { symbol: "USDC", address: MAINNET_V3.tokens.USDC as Address, decimals: 6, name: "USD Coin" },
  { symbol: "USDT", address: USDT_ADDRESS, decimals: 6, name: "Tether USD" },
] as const;

/** BNB Chain wallet tokens. All BSC stables are 18 decimals (unlike Celo). */
function bscWalletTokens(chainId: number): readonly TokenMeta[] {
  const d = bscDeployments[chainId] ?? {};
  const rows: TokenMeta[] = [];
  if (d.USDT) rows.push({ symbol: "USDT", address: d.USDT, decimals: 18, name: "Tether USD (BSC)" });
  if (d.USDC) rows.push({ symbol: "USDC", address: d.USDC, decimals: 18, name: "USD Coin (BSC)" });
  if (d.WBNB) rows.push({ symbol: "WBNB", address: d.WBNB, decimals: 18, name: "Wrapped BNB" });
  return rows;
}

/** Wallet tokens for the given chain: Celo set by default, BSC set on 56/97. */
export function walletTokensFor(chainId?: number): readonly TokenMeta[] {
  return chainId !== undefined && isBscChain(chainId) ? bscWalletTokens(chainId) : WALLET_TOKENS;
}

export function tokenBySymbol(symbol: TokenSymbol, chainId?: number): TokenMeta {
  const list = walletTokensFor(chainId);
  // Falls back to the Celo set when a BSC chain has no tokens configured (callers
  // must gate sends on walletTokensFor(chainId).length).
  const found = list.find((t) => t.symbol === symbol) ?? list[0] ?? WALLET_TOKENS.find((t) => t.symbol === symbol);
  if (!found) throw new Error(`Unknown token symbol ${symbol}`);
  return found;
}
