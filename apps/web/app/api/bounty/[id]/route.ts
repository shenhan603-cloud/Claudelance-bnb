import { NextResponse } from "next/server";

import { readBountyDetail } from "@/lib/bounty-reads";
import { DEFAULT_CHAIN_ID, LIVE_CHAIN_IDS } from "@/lib/chain";

// Short window: this is the only cache layer between a fresh submission and
// the poster's screen.
export const revalidate = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // max-age=0: MiniPay's webview must not hold a pre-submission snapshot in
  // the browser cache; the short s-maxage keeps RPC load off the origin.
  "Cache-Control": "public, max-age=0, s-maxage=5, stale-while-revalidate=25",
};

type Params = Promise<{ id: string }>;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { id: rawId } = await params;
  const bountyId = parseBountyId(rawId);
  if (!bountyId) {
    return NextResponse.json({ error: "id must be a positive bounty id" }, { status: 400, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const chainIdRaw = url.searchParams.get("chainId");
  const chainId = chainIdRaw ? Number(chainIdRaw) : DEFAULT_CHAIN_ID;
  if (!(LIVE_CHAIN_IDS as readonly number[]).includes(chainId)) {
    return NextResponse.json(
      { error: `chainId must be one of ${LIVE_CHAIN_IDS.join(", ")} (BSC mainnet pending deploy)` },
      { status: 400, headers: corsHeaders },
    );
  }

  const detail = await readBountyDetail(bountyId, chainId);
  if (!detail) {
    return NextResponse.json({ error: "bounty not found" }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json(detail, { headers: corsHeaders });
}

function parseBountyId(value: string) {
  try {
    const id = BigInt(value);
    return id >= 1n ? id : null;
  } catch {
    return null;
  }
}
