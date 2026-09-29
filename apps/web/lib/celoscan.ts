import { explorerBase, isBscChain } from "@/lib/chain";

/** Canonical Celoscan base URL for Celo Mainnet (chain 42220). */
const CELOSCAN_BASE = "https://celoscan.io";

/** Explorer base for a chain: Celoscan by default, BscScan on BNB Chain (56/97). */
function base(chainId?: number): string {
  return chainId !== undefined && isBscChain(chainId) ? explorerBase(chainId) : CELOSCAN_BASE;
}

export function txUrl(hash: string, chainId?: number): string {
  return `${base(chainId)}/tx/${hash}`;
}

export function addressUrl(address: string, chainId?: number): string {
  return `${base(chainId)}/address/${address}`;
}

export function contractCodeUrl(address: string, chainId?: number): string {
  return `${base(chainId)}/address/${address}#code`;
}

/** Explorer page for a specific NFT token (e.g. an ERC-8004 Identity). */
export function nftUrl(contract: string, tokenId: bigint | number | string, chainId?: number): string {
  return `${base(chainId)}/nft/${contract}/${tokenId}`;
}
