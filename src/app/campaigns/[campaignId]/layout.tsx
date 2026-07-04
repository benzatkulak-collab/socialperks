import type { Metadata } from "next";
import type { ReactNode } from "react";

// /campaigns/[id] is the owner's in-app campaign view (client-rendered,
// auth-gated). The public shareable surface is /c/[id]; this internal view
// must not be indexed, or it inherits the homepage title as thin content.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CampaignDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
