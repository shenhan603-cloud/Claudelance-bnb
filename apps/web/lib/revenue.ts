import { type Address } from "viem";

import { CLAUDELANCE_CORE_V3_ABI } from "@yeheskieltame/claudelance-types";

import { DEFAULT_CHAIN_ID, publicClientFor } from "./chain";
import { getDeployment } from "./contracts";

export type TokenAmounts = {
  cUSD: bigint;
  CELO: bigint;
  USDC: bigint;
};

export type TreasuryRevenue = TokenAmounts;

/**
 * Server-side multicall reading protocol revenue per token from the v3 proxy.
 * v3 (EIP-7201 storage) exposes revenue as index 1 of `getStatsV3(token)`.
 * Default chain is Celo mainnet; pass chainId for BNB Chain.
 */
export async function fetchTreasuryRevenue(
  chainId: number = DEFAULT_CHAIN_ID,
): Promise<TreasuryRevenue> {
  const deployment = getDeployment(chainId);
  const client = publicClientFor(chainId);

  const results = await client.multicall({
    contracts: [
      makeV3StatsRead(deployment.core, deployment.tokens.cUSD),
      makeV3StatsRead(deployment.core, deployment.tokens.CELO),
      makeV3StatsRead(deployment.core, deployment.tokens.USDC),
    ],
    allowFailure: true,
  });

  const revenue = (i: number): bigint => {
    const r = results[i];
    if (!r || r.status === "failure") return 0n;
    return (r.result as readonly bigint[])[1] ?? 0n;
  };

  return { cUSD: revenue(0), CELO: revenue(1), USDC: revenue(2) };
}

function makeV3StatsRead(core: Address, token: Address) {
  return {
    address: core as `0x${string}`,
    abi: CLAUDELANCE_CORE_V3_ABI,
    functionName: "getStatsV3" as const,
    args: [token] as const,
  };
}
