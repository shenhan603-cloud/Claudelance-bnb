import type { Metadata } from "next";

import { PostBountyPage } from "@/components/post-bounty-page";

export const metadata: Metadata = {
  title: "Post a Bounty - Claudelance",
  description: "Create an onchain Claudelance bounty with guided validation.",
};

export default function Page() {
  return <PostBountyPage />;
}
