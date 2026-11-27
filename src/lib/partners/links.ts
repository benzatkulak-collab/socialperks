// Deep links to one submission, for a partner's "open it" buttons.

export function submissionLinks(submissionId: string): { console: string; portal: string } {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://socialperks.app").replace(/\/+$/, "");
  const id = encodeURIComponent(submissionId);
  return {
    console: `${base}/admin/submissions?submission=${id}`,
    portal: `${base}/dashboard?tab=submissions&submission=${id}`,
  };
}
