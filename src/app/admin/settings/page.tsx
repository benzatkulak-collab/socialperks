import { ComingSoon } from "@/components/admin/coming-soon";

export default function AdminSettingsPage() {
  return (
    <ComingSoon
      title="Platform Settings"
      description="Pricing oracle, benchmarks, brand, infrastructure"
      features={[
        "Pricing oracle config (tier prices, follower bonuses)",
        "Industry benchmarks data — edit / version / publish",
        "Email sender domain + footer settings",
        "OAuth app credentials per platform (rotate, revoke)",
        "Maintenance mode toggle",
      ]}
    />
  );
}
