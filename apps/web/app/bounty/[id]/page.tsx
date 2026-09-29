import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, User, Trophy, Clock, Coins, Shield, Layers, Github, Lock, FileText } from "lucide-react";
import Link from "next/link";
import { MAINNET_V3 } from "@yeheskieltame/claudelance-types";

import { Header } from "@/components/header";
import { BountyDetailClient } from "@/components/bounty-detail";
import { TaskTypeBadge } from "@/components/bounty-card";
import { GlassCard } from "@/components/ui/card";
import { readBountyDetail, type BountyDetailJson } from "@/lib/bounty-reads";
import { DEFAULT_CHAIN_ID, LIVE_CHAIN_IDS, explorerBase } from "@/lib/chain";
import { getDeployment } from "@/lib/contracts";
import { formatTokenAmount } from "@/lib/format-token";
import { shortAddress } from "@/lib/utils";

type Params = Promise<{ id: string }>;
type Search = Promise<{ chainId?: string }>;

type BountyJson = BountyDetailJson;

// The brief/instruction URL is not always a GitHub issue (it can be a Gist, a
// spec page, or - for cross-project dogfood bounties - an app URL like
// bingochain.vercel.app). Adapt the link's icon + label to what it actually is.
function describeBriefLink(url: string): { label: string; isGithub: boolean } {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname;
  } catch {
    return { label: "Open the brief", isGithub: false };
  }
  if (host === "gist.github.com") return { label: "View the Gist", isGithub: true };
  if (host === "github.com" || host.endsWith(".github.com")) {
    if (/\/issues\/\d+/.test(path)) return { label: "View the GitHub issue", isGithub: true };
    if (/\/pull\/\d+/.test(path)) return { label: "View the pull request", isGithub: true };
    return { label: "View on GitHub", isGithub: true };
  }
  return { label: `Open the brief on ${host}`, isGithub: false };
}

// Direct chain read instead of a self-fetch through /api/bounty/[id]: the
// page is dynamic, so every request sees the freshest state (the poster lands
// here right after a worker submits) without an extra HTTP hop per view.
async function fetchBounty(id: string, chainId: number): Promise<BountyJson | null> {
  let bountyId: bigint;
  try {
    bountyId = BigInt(id);
  } catch {
    return null;
  }
  if (bountyId < 1n) return null;

  try {
    return await readBountyDetail(bountyId, chainId);
  } catch {
    return null;
  }
}

export default async function BountyDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id } = await params;
  const { chainId: chainIdRaw } = await searchParams;
  const chainId = chainIdRaw ? Number(chainIdRaw) : DEFAULT_CHAIN_ID;
  const bounty = await fetchBounty(id, chainId);

  if (!bounty) notFound();

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      <Header />

      <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28">
        <Link
          href="/bounties"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bounties
        </Link>

        <BountyHeader bounty={bounty} chainId={chainId} />

        <Suspense
          fallback={
            <GlassCard className="mt-6 !p-8">
              <div className="h-32 animate-pulse rounded-xl bg-muted" />
            </GlassCard>
          }
        >
          <BountyDetailClient bounty={bounty} />
        </Suspense>
      </section>
    </main>
  );
}

function BountyHeader({ bounty, chainId = DEFAULT_CHAIN_ID }: { bounty: BountyJson; chainId?: number }) {
  const explorer = explorerBase(chainId);
  const deploy = getDeployment(chainId);
  const token = normalizeTokenSymbol(bounty.token, chainId);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isPastDeadline = Number(bounty.deadline) <= nowSeconds;
  const isDirectHire =
    bounty.targetWorker !== "0x0000000000000000000000000000000000000000";
  const statusLabel =
    bounty.status === 1
      ? "Resolved"
      : bounty.status === 2
        ? "Cancelled"
        : bounty.status === 0 && isPastDeadline
          ? "Expired"
          : "Open";
  const statusColor =
    statusLabel === "Resolved"
      ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20"
      : statusLabel === "Open"
        ? "bg-primary/10 text-primary border border-primary/20"
        : "bg-muted text-muted-foreground border border-border";

  const repoTitle = bounty.targetRepoUrl
    ? bounty.targetRepoUrl
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/\/issues\/\d+$/, "")
    : `Bounty #${bounty.id}`;

  const deadlineDate = formatDeadlineFull(bounty.deadline);

  const briefUrl = bounty.instructionUrl || bounty.targetRepoUrl;
  const brief = briefUrl ? describeBriefLink(briefUrl) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
          #{bounty.id}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
        <TaskTypeBadge bountyType={bounty.bountyType} />
        {isDirectHire && (
          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
            Direct hire
          </span>
        )}
        {bounty.ciRequired && (
          <span className="rounded-full border border-amber-500/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
            CI required
          </span>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {repoTitle}
        </h1>
        {briefUrl && brief && (
          <a
            href={briefUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
          >
            {brief.isGithub ? (
              <Github className="h-4 w-4" aria-hidden />
            ) : (
              <FileText className="h-4 w-4" aria-hidden />
            )}
            {brief.label}
            <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
          </a>
        )}
      </div>

      {isDirectHire && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Reserved for a specific worker</p>
            <p className="mt-1 text-muted-foreground">
              This is a direct hire. Only{" "}
              <Link
                href={`/worker/${bounty.targetWorker.toLowerCase()}`}
                className="font-mono text-primary hover:underline"
              >
                {shortAddress(bounty.targetWorker)}
              </Link>{" "}
              can claim and submit. Don&apos;t start work unless you&apos;re the targeted worker.
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Coins className="h-4 w-4" />} label="Reward" value={`${formatToken(bounty.amount, bounty.token, chainId)} ${token}`} highlight />
        <StatCard icon={<Shield className="h-4 w-4" />} label="Stake" value={`${formatToken(bounty.stakeRequired, bounty.token, chainId)} ${token}`} />
        <StatCard icon={<Layers className="h-4 w-4" />} label="Slots" value={`${bounty.claimedSlots} / ${bounty.maxSlots}`} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Deadline" value={deadlineDate} />
      </div>

      {/* Meta info panel */}
      <GlassCard className="!p-4 !rounded-2xl">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <MetaRow icon={<User className="h-3.5 w-3.5" />} label="Poster">
            <a
              href={`${explorer}/address/${bounty.poster}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs hover:text-primary transition-colors"
            >
              {shortAddress(bounty.poster)}
            </a>
          </MetaRow>

          {bounty.status === 1 &&
            bounty.winner !== "0x0000000000000000000000000000000000000000" && (
              <MetaRow icon={<Trophy className="h-3.5 w-3.5 text-emerald-500" />} label="Winner">
                <Link
                  href={`/worker/${bounty.winner.toLowerCase()}`}
                  className="font-mono text-xs text-emerald-600 hover:text-emerald-500 dark:text-emerald-300 transition-colors"
                >
                  {shortAddress(bounty.winner)}
                </Link>
              </MetaRow>
            )}

          {isDirectHire && (
            <MetaRow icon={<User className="h-3.5 w-3.5 text-violet-500" />} label="Targeted worker">
              <Link
                href={`/worker/${bounty.targetWorker.toLowerCase()}`}
                className="font-mono text-xs text-violet-600 hover:text-violet-500 dark:text-violet-300 transition-colors"
              >
                {shortAddress(bounty.targetWorker)}
              </Link>
            </MetaRow>
          )}

          <MetaRow icon={<ExternalLink className="h-3.5 w-3.5" />} label="On-chain">
            <a
              href={`${explorer}/address/${deploy.core}#readContract`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ClaudelanceCore · bountyId {bounty.id}
            </a>
          </MetaRow>
        </dl>
      </GlassCard>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <GlassCard className="!p-4 !rounded-2xl">
      <div className={`flex items-center gap-1.5 text-xs uppercase tracking-wider ${highlight ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <p className={`mt-1.5 text-base font-semibold tracking-tight ${highlight ? "text-primary" : ""}`}>
        {value}
      </p>
    </GlassCard>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
      <dt className="w-28 flex-shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function normalizeTokenSymbol(token: string, chainId: number = DEFAULT_CHAIN_ID) {
  const deploy = getDeployment(chainId);
  const TOKENS: Record<string, string> = {
    [deploy.tokens.cUSD.toLowerCase()]: deploy.tokenSymbols?.cUSD ?? "cUSD",
    [deploy.tokens.CELO.toLowerCase()]: deploy.tokenSymbols?.CELO ?? "CELO",
    [deploy.tokens.USDC.toLowerCase()]: deploy.tokenSymbols?.USDC ?? "USDC",
    ["0xb70c9Cd73428Afe51eEEA832C49E8840D3f85cA2".toLowerCase()]: "LANCE",
  };
  return TOKENS[token.toLowerCase()] ?? token.slice(0, 6) + "...";
}

function formatToken(raw: string, tokenAddress: string, chainId: number = DEFAULT_CHAIN_ID): string {
  const deploy = getDeployment(chainId);
  // Celo USDC is 6 decimals; every BSC slot (USDT/WBNB/USDC) is 18.
  const decimals =
    tokenAddress.toLowerCase() === deploy.tokens.USDC.toLowerCase()
      ? (deploy.tokenDecimals?.USDC ?? 6)
      : 18;
  try {
    return formatTokenAmount(BigInt(raw), decimals, 2);
  } catch {
    return "0";
  }
}

function formatDeadlineFull(deadline: string) {
  const d = Number(deadline);
  const date = new Date(d < 10_000_000_000 ? d * 1000 : d);
  if (Number.isNaN(date.getTime())) return "-";
  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / 86_400_000);
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days <= 0) return `${dateStr} · Expired`;
  if (days === 1) return `${dateStr} · 1 day left`;
  return `${dateStr} · ${days}d left`;
}
