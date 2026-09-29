import { NextResponse } from "next/server";

import { DEFAULT_CHAIN_ID, LIVE_CHAIN_IDS, publicClientFor } from "@/lib/chain";
import { getDeployment } from "@/lib/contracts";

export const revalidate = 30;

export async function GET(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const chainIdRaw = url.searchParams.get("chainId");
  const chainId = chainIdRaw ? Number(chainIdRaw) : DEFAULT_CHAIN_ID;
  if (!(LIVE_CHAIN_IDS as readonly number[]).includes(chainId)) {
    return NextResponse.json(
      { error: `chainId must be one of ${LIVE_CHAIN_IDS.join(", ")} (BSC mainnet pending deploy)` },
      { status: 400 },
    );
  }
  const deploy = getDeployment(chainId);

  let blockNumber: string | null = null;
  let rpcMs: number | null = null;
  let rpcOk = false;
  try {
    const client = publicClientFor(chainId);
    const rpcStart = Date.now();
    const block = await client.getBlockNumber();
    rpcMs = Date.now() - rpcStart;
    blockNumber = block.toString();
    rpcOk = true;
  } catch {
    rpcOk = false;
  }

  return NextResponse.json(
    {
      ok: rpcOk,
      chainId,
      core: deploy.core,
      blockNumber,
      rpcMs,
      uptimeStartedAt: startedAt,
    },
    { headers: { "cache-control": "public, max-age=30, s-maxage=30" } },
  );
}
