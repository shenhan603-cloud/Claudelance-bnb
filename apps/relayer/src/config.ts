import { deploymentForNetwork, type Deployment } from '@yeheskieltame/claudelance-sdk';

/** Celo mainnet (default, live) or BNB Chain mainnet / testnet. */
export type NetworkKey = 'celo' | 'bsc' | 'bscTestnet';

export type RelayerConfig = {
  network: NetworkKey;
  deployment: Deployment;
  rpcUrl: string | undefined;
  relayerPrivateKey: `0x${string}` | undefined;
  githubWebhookSecret: string | undefined;
  /** When true, actions are computed and logged but never broadcast. */
  dryRun: boolean;
  port: number;
  keeperIntervalMs: number;
  /**
   * Warn-below threshold for the keeper's native CELO balance, in wei. Gas
   * spikes have starved the signer before, so each tick logs a warning when the
   * balance drops under this floor (default 0.6 CELO) before writes start to
   * revert. Set via KEEPER_MIN_BALANCE_CELO (a decimal CELO amount).
   */
  keeperMinBalanceWei: bigint;
  /** How often the event watcher polls for new logs that trigger an instant tick. */
  eventPollMs: number;
  eventsFromBlock: bigint;
  identityEventsFromBlock: bigint;
  /** Base URL of the off-chain Coworking API (the reputation bridge source). */
  coworkingApiUrl: string | undefined;
  /**
   * Admin-scoped Coworking API keys, one per workspace the bridge serves
   * (COWORKING_API_KEYS, comma-split). Each key is a Bearer token over plain HTTP.
   */
  coworkingApiKeys: string[];
  /**
   * Master switch for the Coworking -> ERC-8004 reputation write-back bridge.
   * Default FALSE: the bridge job is not even scheduled unless this is true.
   */
  reputationBridgeEnabled: boolean;
  /**
   * Bridge dry-run. INDEPENDENT of the keeper's `dryRun` so the bridge can ship
   * dormant while the keeper runs live. Default TRUE: log the intended
   * giveFeedback, never send, never ack. Going live is an explicit env flip.
   */
  reputationBridgeDryRun: boolean;
  /** How often the bridge polls Coworking for pending reputation write-backs. */
  reputationBridgeIntervalMs: number;
};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

/**
 * Resolve the network from RELAYER_NETWORK ('celo' | 'bsc' | 'bscTestnet') or
 * CHAIN_ID (42220 | 56 | 97). Defaults to Celo Mainnet (42220), the live chain.
 */
function parseNetwork(value: string | undefined, chainId: string | undefined): NetworkKey {
  const v = (value ?? '').trim();
  if (v === 'bsc' || v === 'bscTestnet') return v;
  if (chainId === '56') return 'bsc';
  if (chainId === '97') return 'bscTestnet';
  // Anything else (including legacy 'sepolia' / 'mainnet') keeps the historical
  // behavior: Celo Mainnet.
  return 'celo';
}

/**
 * Parse a decimal CELO amount (e.g. "0.6") into wei. Falls back to `fallback`
 * on an empty or non-finite value so a typo never silently disables the alert.
 */
function parseCeloToWei(value: string | undefined, fallback: bigint): bigint {
  if (value === undefined || value.trim() === '') return fallback;
  const celo = Number(value);
  if (!Number.isFinite(celo) || celo < 0) return fallback;
  return BigInt(Math.round(celo * 1e9)) * 1_000_000_000n; // 1e9 * 1e9 = 1e18, no float wei
}

/**
 * Default first block to scan for DeliverableSubmitted logs. This is the v3
 * mainnet proxy deploy block, so webhook lookups never reach back toward genesis
 * (forno times out on an unbounded eth_getLogs).
 */
const DEFAULT_EVENTS_FROM_BLOCK: Record<NetworkKey, bigint | undefined> = {
  celo: 68_689_178n,
  // TODO(bnb): set to the BSC mainnet proxy deploy block once deployed. Until then
  // EVENTS_FROM_BLOCK must be provided explicitly on BSC mainnet.
  bsc: undefined,
  bscTestnet: 132_984_885n, // BSC testnet v3 proxy deploy block
};

/**
 * Floor for the agentId mint scan on the ERC-8004 Identity Registry. The
 * mainnet registry went live early Feb 2026 (~block 58M), so no mint can
 * predate it.
 */
const DEFAULT_IDENTITY_FROM_BLOCK: Record<NetworkKey, bigint | undefined> = {
  celo: 58_000_000n,
  // TODO(bnb): ERC-8004 registry deploy era on BSC; provide IDENTITY_EVENTS_FROM_BLOCK.
  bsc: undefined,
  bscTestnet: undefined,
};

function blockFloor(
  value: string | undefined,
  defaults: Record<NetworkKey, bigint | undefined>,
  network: NetworkKey,
  name: string,
): bigint {
  if (value !== undefined && value !== '') return BigInt(value);
  const d = defaults[network];
  if (d === undefined) {
    throw new Error(`[relayer] ${name} is required on ${network} (no default scan floor yet)`);
  }
  return d;
}

/**
 * Build the relayer config from the environment. Celo mainnet (default) resolves
 * to the live v3 proxy deployment; BNB Chain (bsc / bscTestnet) needs CORE_ADDRESS. Fails fast when asked to broadcast (DRY_RUN=false)
 * without a signing key, so a misconfigured deploy never silently runs without
 * the ability to act.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): RelayerConfig {
  const network = parseNetwork(env.RELAYER_NETWORK, env.CHAIN_ID);
  // Celo resolves to the live v3 proxy. BNB Chain needs CORE_ADDRESS until
  // the canonical BSC records are published in claudelance-types.
  const deployment = deploymentForNetwork(
    network,
    (env.CORE_ADDRESS || undefined) as `0x${string}` | undefined,
  );
  const dryRun = parseBool(env.DRY_RUN, true);
  const relayerPrivateKey = env.RELAYER_PRIVATE_KEY
    ? (env.RELAYER_PRIVATE_KEY as `0x${string}`)
    : undefined;

  if (!dryRun && !relayerPrivateKey) {
    throw new Error('[relayer] DRY_RUN=false requires RELAYER_PRIVATE_KEY to sign transactions');
  }

  const coworkingApiUrl = env.COWORKING_API_URL || undefined;
  const coworkingApiKeys = (env.COWORKING_API_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k !== '');
  const reputationBridgeEnabled = parseBool(env.REPUTATION_BRIDGE_ENABLED, false);
  const reputationBridgeDryRun = parseBool(env.REPUTATION_BRIDGE_DRY_RUN, true);

  if (reputationBridgeEnabled && (!coworkingApiUrl || coworkingApiKeys.length === 0)) {
    throw new Error(
      '[relayer] REPUTATION_BRIDGE_ENABLED requires COWORKING_API_URL and a non-empty COWORKING_API_KEYS',
    );
  }

  return {
    network,
    deployment,
    rpcUrl: env.RELAYER_RPC_URL || undefined,
    relayerPrivateKey,
    githubWebhookSecret: env.GITHUB_WEBHOOK_SECRET || undefined,
    dryRun,
    port: Number(env.PORT ?? 8787),
    keeperIntervalMs: Number(env.KEEPER_INTERVAL_MS ?? 60_000),
    // Native gas token floor: CELO on Celo, BNB on BSC (KEEPER_MIN_BALANCE_NATIVE wins).
    keeperMinBalanceWei: parseCeloToWei(
      env.KEEPER_MIN_BALANCE_NATIVE || env.KEEPER_MIN_BALANCE_CELO,
      network === 'celo' ? 600_000_000_000_000_000n : 10_000_000_000_000_000n, // 0.6 CELO / 0.01 BNB
    ),
    eventPollMs: Number(env.EVENT_POLL_MS ?? 5_000),
    eventsFromBlock: blockFloor(env.EVENTS_FROM_BLOCK, DEFAULT_EVENTS_FROM_BLOCK, network, 'EVENTS_FROM_BLOCK'),
    identityEventsFromBlock: blockFloor(
      env.IDENTITY_EVENTS_FROM_BLOCK,
      DEFAULT_IDENTITY_FROM_BLOCK,
      network,
      'IDENTITY_EVENTS_FROM_BLOCK',
    ),
    coworkingApiUrl,
    coworkingApiKeys,
    reputationBridgeEnabled,
    reputationBridgeDryRun,
    reputationBridgeIntervalMs: Number(env.REPUTATION_BRIDGE_INTERVAL_MS ?? 300_000),
  };
}
