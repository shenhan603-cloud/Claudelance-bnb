import {
  CLAUDELANCE_CORE_V3_ABI,
  MAINNET_V3,
  type Deployment,
} from "@yeheskieltame/claudelance-types";

/** Default ABI for ClaudelanceCore - v3 (UUPS proxy). */
export const coreAbi = CLAUDELANCE_CORE_V3_ABI;

function flatten(d: Deployment) {
  return {
    core: d.core,
    version: d.version,
    cUSD: d.tokens.cUSD,
    CELO: d.tokens.CELO,
    USDC: d.tokens.USDC,
    tokens: d.tokens,
    treasury: d.treasury,
    ciRelayer: d.ciRelayer,
    owner: d.owner,
  };
}

export const deployments = {
  [MAINNET_V3.chainId]: flatten(MAINNET_V3),
} as const;

export function getDeployment(chainId: number) {
  const entry = deployments[chainId as keyof typeof deployments];
  if (!entry) throw new Error(`No Claudelance deployment for chain ${chainId}`);
  return entry;
}

// ─── BNB Chain (additive) ────────────────────────────────────────────────────
// Celo mainnet above remains the live production deployment. BNB Chain
// deployments are configured via env until ClaudelanceCore is deployed there.
// BSC stables (USDT/USDC) use 18 decimals, unlike Celo USDC (6).
type Hex = `0x${string}`;

function envAddr(value: string | undefined): Hex | undefined {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Hex) : undefined;
}

export const bscDeployments: Record<number, { core?: Hex; USDT?: Hex; USDC?: Hex; WBNB?: Hex }> = {
  56: {
    core: envAddr(process.env.NEXT_PUBLIC_BSC_CORE_ADDRESS),
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  },
  97: {
    core: envAddr(process.env.NEXT_PUBLIC_BSC_TESTNET_CORE_ADDRESS),
    // Testnet: MockERC20 (18 dec) deployed alongside the core.
    USDT: envAddr(process.env.NEXT_PUBLIC_BSC_TESTNET_USDT_ADDRESS),
    WBNB: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", // canonical testnet WBNB
  },
};

