import type { Metadata } from "next";
import type { ReactNode } from "react";

// /programs is an auth-gated, client-rendered in-app list. Left indexable it
// inherits the homepage's title and gets crawled as thin, duplicate content,
// so it must be noindexed. (The page itself is "use client" and can't export
// metadata, hence this layout.)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProgramsLayout({ children }: { children: ReactNode }) {
  return children;
}
