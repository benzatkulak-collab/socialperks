import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Social Perks",
  description: "Internal operations dashboard for Social Perks platform administration.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
