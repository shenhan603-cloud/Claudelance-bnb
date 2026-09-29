"use client";

import { Check } from "lucide-react";
import { useAccount } from "wagmi";

export function ConnectedSelfBadge({ pageAddress }: { pageAddress: string }) {
  const { address, isConnected } = useAccount();
  if (!isConnected || !address) return null;
  if (address.toLowerCase() !== pageAddress.toLowerCase()) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
      <Check aria-hidden="true" className="h-3 w-3" />
      This is you
    </span>
  );
}
