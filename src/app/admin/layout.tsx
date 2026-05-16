import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AdminGuard } from "@/components/admin/admin-guard";

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
  return (
    <div className="min-h-screen bg-brand-bg flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopbar />
        <main className="flex-1 min-w-0">
          <AdminGuard>{children}</AdminGuard>
        </main>
      </div>
    </div>
  );
}
