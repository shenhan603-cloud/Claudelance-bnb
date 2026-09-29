"use client";

import * as React from "react";
import { useAccount, useConnect } from "wagmi";

import { isMiniPay } from "@/lib/wallet/config";

/// Inside the MiniPay in-app browser the wallet is implicit: the dapp must
/// connect eagerly on mount so no separate "Connect" button is shown. Outside
/// MiniPay this is a no-op and the normal connect flow applies.
export function MiniPayAutoConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  React.useEffect(() => {
    if (typeof window === "undefined" || isConnected) return;
    if (!isMiniPay(window.ethereum)) return;
    const connector = connectors.find((item) => item.id === "minipay") ?? connectors[0];
    if (connector) connect({ connector });
  }, [connect, connectors, isConnected]);

  return null;
}
