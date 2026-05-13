/**
 * /analytics — Redirect to the dashboard with the analytics tab open.
 *
 * Analytics is an in-app tab in the business portal (page === 'analytics'
 * inside src/components/business/portal.tsx). Users who try the bare
 * /analytics URL otherwise hit a 404, which is inconsistent with
 * /programs and /exchange that do have real routes.
 *
 * Use a `?tab=analytics` query param the portal can read to set the
 * starting tab.
 */
import { redirect } from "next/navigation";

export default function AnalyticsPage() {
  redirect("/dashboard?tab=analytics");
}
