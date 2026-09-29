import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BountiesTable } from "@/components/bounties-table";

export default function BountiesPage() {
  return (
    <main className="relative isolate min-h-svh overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-[0.04] dark:opacity-[0.08]"
      />
      <div
        aria-hidden
        className="noise pointer-events-none fixed inset-0 -z-10 opacity-[0.015] dark:opacity-[0.03]"
      />

      <Header />
      <BountiesTable />
      <Footer />
    </main>
  );
}
