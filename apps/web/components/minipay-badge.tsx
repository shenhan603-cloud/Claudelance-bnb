"use client";

import { Smartphone } from "lucide-react";

import { useMiniPayDetection } from "@/lib/minipay";

export function MiniPayBadge() {
  const isMiniPay = useMiniPayDetection();
  if (!isMiniPay) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      <Smartphone aria-hidden="true" className="h-3 w-3" />
      Connected via MiniPay
    </span>
  );
}
