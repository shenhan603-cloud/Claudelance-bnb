"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { WalletButton } from "@/components/wallet-button";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Logo is the Home affordance on desktop, so drop Home from the text links.
const navLinks = PRIMARY_NAV.filter((item) => item.href !== "/");

export function Header() {
  const pathname = usePathname() || "/";

  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-6xl px-4">
      <nav className="glass flex h-14 items-center justify-between rounded-full px-4 sm:h-16 sm:px-6">
        <Link href="/" className="touch-target -ml-2 inline-flex items-center gap-2 rounded-full px-2">
          <Image
            src="/logo.webp"
            alt="Claudelance"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
            priority
          />
          <span className="hidden font-display text-[0.95rem] font-bold tracking-tight sm:inline">
            Claudelance
          </span>
        </Link>

        <ul className="hidden items-center gap-1 text-sm font-medium text-muted-foreground md:flex">
          {navLinks.map((link) => {
            const active = link.match(pathname);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "touch-target inline-flex items-center rounded-full px-3.5 transition-colors hover:text-foreground",
                    active ? "bg-primary/15 text-foreground" : "hover:bg-accent/60",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
        </div>
      </nav>
    </header>
  );
}
