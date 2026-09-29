import { NextResponse } from "next/server";

import { fetchLiveStats } from "@/lib/stats";
import { DEFAULT_CHAIN_ID, LIVE_CHAIN_IDS } from "@/lib/chain";

export const revalidate = 30;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const chainIdRaw = url.searchParams.get("chainId");
    const chainId = chainIdRaw ? Number(chainIdRaw) : DEFAULT_CHAIN_ID;
    if (!(LIVE_CHAIN_IDS as readonly number[]).includes(chainId)) {
      return NextResponse.json(
        { error: `chainId must be one of ${LIVE_CHAIN_IDS.join(", ")} (BSC mainnet pending deploy)` },
        { status: 400 },
      );
    }

    const stats = await fetchLiveStats(chainId);
    return NextResponse.json(
      {
        bountyCount: stats.bountyCount.toString(),
        totalBountyVolume: stats.totalBountyVolume.toString(),
        totalProtocolRevenue: stats.totalProtocolRevenue.toString(),
        totalBountiesResolved: stats.totalBountiesResolved.toString(),
        uniquePosterCount: stats.uniquePosterCount.toString(),
        uniqueWorkerCount: stats.uniqueWorkerCount.toString(),
        feeBps: Number(stats.feeBps),
        graceSeconds: Number(stats.graceSeconds),
      },
      { headers: { "cache-control": "public, max-age=30, s-maxage=30" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "stats unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
