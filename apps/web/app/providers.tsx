"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { WagmiProvider } from "wagmi";

import { MiniPayAutoConnect } from "@/components/minipay-auto-connect";
import { TransactionToast } from "@/components/transaction-toast";
import { wagmiConfig } from "@/lib/wallet/config";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <MiniPayAutoConnect />
          {children}
          <TransactionToast />
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
