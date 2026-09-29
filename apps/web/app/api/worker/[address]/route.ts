import { NextResponse } from "next/server";
import type { Address } from "viem";

import { fetchWorkerHistory } from "@/lib/worker-history";
import { fetchWorkerIdentity } from "@/lib/worker-identity";
import { fetchWorkerStats } from "@/lib/worker-stats";
import { DEFAULT_CHAIN_ID, LIVE_CHAIN_IDS } from "@/lib/chain";

export const revalidate = 30;

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

type Params = Promise<{ address: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { address } = await params;

  if (!ADDR_RE.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const url = new URL(request.url);
  const chainIdRaw = url.searchParams.get("chainId");
  const chainId = chainIdRaw ? Number(chainIdRaw) : DEFAULT_CHAIN_ID;
  if (!(LIVE_CHAIN_IDS as readonly number[]).includes(chainId)) {
    return NextResponse.json(
      { error: `chainId must be one of ${LIVE_CHAIN_IDS.join(", ")} (BSC mainnet pending deploy)` },
      { status: 400 },
    );
  }

  const lowercased = address.toLowerCase() as Address;

  try {
    const [stats, history, identity] = await Promise.all([
      fetchWorkerStats(lowercased, chainId),
      fetchWorkerHistory(lowercased, chainId).catch(() => []),
      fetchWorkerIdentity(lowercased, chainId),
    ]);

    return NextResponse.json(
      {
        address: lowercased,
        hasIdentity: identity.hasIdentity,
        identityRegistry: identity.registry,
        agentId: identity.agentId?.toString() ?? null,
        feedbackCount: identity.feedbackCount,
        earnings: stats.earnings.map((row) => ({
          symbol: row.symbol,
          token: row.token,
          amount: row.amount.toString(),
        })),
        history: history.map((row) => ({
          bountyId: row.bountyId.toString(),
          winnerPayout: row.winnerPayout.toString(),
          token: row.token,
        })),
      },
      { headers: { "cache-control": "public, max-age=30, s-maxage=30" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "worker data unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
