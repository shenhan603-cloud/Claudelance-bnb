import { createPublicClient, formatUnits, http } from "viem";

import { CLAUDELANCE_CORE_V3_ABI } from "@yeheskieltame/claudelance-types";
import { DEFAULT_CHAIN_ID, chainById, isBscChain, publicClientFor } from "./chain";
import { getDeployment } from "./contracts";

// On-chain constants.
const PROTOCOL_FEE_BPS = 200n; // 2%
const RESOLUTION_GRACE_PERIOD_SECONDS = 259_200n; // 3 days
import { getCeloUsdPrice, getNativeUsdPrice, tokenToCeloWei } from "./price";

export type LiveStats = {
  bountyCount: bigint;
  totalBountyVolume: bigint;
  totalProtocolRevenue: bigint;
  totalBountiesResolved: bigint;
  uniquePosterCount: bigint;
  uniqueWorkerCount: bigint;
  feeBps: bigint;
  graceSeconds: bigint;
  /// Per-token raw volumes (wei, native decimals).
  volumeByToken: {
    cUSD: bigint;
    CELO: bigint;
    USDC: bigint;
  };
  /// Cross-token volume expressed in CELO wei, computed via the CELO/USD oracle.
  /// cUSD and USDC are treated as $1 stablecoins, then converted at the live rate.
  totalVolumeInCelo: bigint;
  celoUsdPrice: number;
  /// Cross-token volume in USD: CELO at the live rate + cUSD/USDC at $1.
  totalVolumeUsd: number;
};

const rpcOverrides: Partial<Record<number, string>> = {
  42_220: process.env.NEXT_PUBLIC_CELO_MAINNET_RPC,
  56: process.env.NEXT_PUBLIC_BSC_RPC_URL,
  97: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL,
};

export async function fetchLiveStats(chainId: number = DEFAULT_CHAIN_ID): Promise<LiveStats> {
  const chain = chainById(chainId);
  if (!chain) throw new Error(`Unsupported chain id ${chainId}`);
  const rpc = rpcOverrides[chainId] ?? chain.rpcUrls.default.http[0];
  const client = createPublicClient({ chain, transport: http(rpc) });
  const deploy = getDeployment(chainId);

  // Protocol stats from the v3 proxy: getStatsV3(token) returns
  // [volume, revenue, resolved, posters, workers, countByType].
  const statsResults = await client.multicall({
    contracts: [
      { address: deploy.core, abi: CLAUDELANCE_CORE_V3_ABI, functionName: "getStatsV3" as const, args: [deploy.cUSD] },
      { address: deploy.core, abi: CLAUDELANCE_CORE_V3_ABI, functionName: "getStatsV3" as const, args: [deploy.CELO] },
      { address: deploy.core, abi: CLAUDELANCE_CORE_V3_ABI, functionName: "getStatsV3" as const, args: [deploy.USDC] },
    ],
    allowFailure: true,
  });

  type StatsV3Tuple = readonly [bigint, bigint, bigint, bigint, bigint, readonly bigint[]];
  const safeStats = (i: number): StatsV3Tuple => {
    const r = statsResults[i];
    if (!r || r.status === "failure") return [0n, 0n, 0n, 0n, 0n, new Array(11).fill(0n) as bigint[]];
    return r.result as unknown as StatsV3Tuple;
  };

  const [sCusd, sCelo, sUsdc] = [safeStats(0), safeStats(1), safeStats(2)];

  // Index: 0=volume, 1=revenue, 2=resolved, 3=posters, 4=workers
  const volCusd = sCusd[0];
  const volCelo = sCelo[0];
  const volUsdc = sUsdc[0];
  const revCusd = sCusd[1];
  const revCelo = sCelo[1];
  const revUsdc = sUsdc[1];
  const totalBountiesResolved = sCusd[2];
  const uniquePosterCount = sCusd[3];
  const uniqueWorkerCount = sCusd[4];
  // v3 keeps no bountyCount getter; its resolved count is the conservative proxy.
  const bountyCount = sCusd[2];
  // Protocol fee and grace period are constants.
  const feeBps = PROTOCOL_FEE_BPS;
  const graceSeconds = RESOLUTION_GRACE_PERIOD_SECONDS;

  const onBsc = isBscChain(chainId);
  // Celo: stables at $1, CELO at the live rate. BSC: USDT/USDC at $1 (18 dec),
  // WBNB at the live BNB rate. `totalVolumeInCelo` carries native-denominated
  // volume (CELO on Celo, BNB on BSC) so the display reads "in native gas token".
  const nativeUsdPrice = onBsc ? await getNativeUsdPrice("binancecoin") : await getCeloUsdPrice();
  const celoUsdPrice = nativeUsdPrice;
  // On BSC every slot is 18 decimals; on Celo USDC is 6.
  const usdcDecimals = onBsc ? 18 : 6;
  const nativeDecimals = 18;
  const cusdInCelo = tokenToCeloWei(volCusd, 18, 1, nativeUsdPrice);
  const usdcInCelo = tokenToCeloWei(volUsdc, usdcDecimals, 1, nativeUsdPrice);
  const totalVolumeInCelo = volCelo + cusdInCelo + usdcInCelo;

  // USD straight from the per-token on-chain volumes: native token at the live
  // rate, stables at their $1 peg.
  const totalVolumeUsd =
    Number(formatUnits(volCelo, nativeDecimals)) * nativeUsdPrice +
    Number(formatUnits(volCusd, 18)) +
    Number(formatUnits(volUsdc, usdcDecimals));

  return {
    bountyCount,
    totalBountyVolume: volCusd + volCelo + volUsdc,
    totalProtocolRevenue: revCusd + revCelo + revUsdc,
    totalBountiesResolved,
    uniquePosterCount,
    uniqueWorkerCount,
    feeBps,
    graceSeconds,
    volumeByToken: { cUSD: volCusd, CELO: volCelo, USDC: volUsdc },
    totalVolumeInCelo,
    celoUsdPrice,
    totalVolumeUsd,
  };
}
