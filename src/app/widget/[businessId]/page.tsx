/**
 * /widget/[businessId] — Standalone embeddable widget page
 *
 * Rendered inside an iframe on third-party sites. Shows the business's
 * active campaigns in a compact layout with no nav/footer.
 * Reads `theme` from searchParams to support light/dark modes.
 */

import { PerkWidget } from "@/components/widget/perk-widget";

interface WidgetPageProps {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ theme?: string }>;
}

export default async function WidgetPage({ params, searchParams }: WidgetPageProps) {
  const { businessId } = await params;
  const { theme: themeParam } = await searchParams;
  const theme = themeParam === "light" ? "light" : "dark";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Social Perks Widget</title>
        <style
          dangerouslySetInnerHTML={{
            __html: getWidgetStyles(theme),
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: theme === "dark" ? "#0C0F1A" : "#FFFFFF",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          color: theme === "dark" ? "#F1F3F9" : "#1A1D2E",
          minHeight: "100vh",
        }}
      >
        <PerkWidget businessId={businessId} theme={theme} />
      </body>
    </html>
  );
}

function getWidgetStyles(theme: string): string {
  const isDark = theme === "dark";
  const bg = isDark ? "#0C0F1A" : "#FFFFFF";
  const surface = isDark ? "#141828" : "#F8F9FC";
  const border = isDark ? "#1E2340" : "#E2E5EF";
  const text = isDark ? "#F1F3F9" : "#1A1D2E";
  const dim = isDark ? "#636B8A" : "#6B7280";
  const muted = isDark ? "#4A5272" : "#9CA3AF";
  const cyan = isDark ? "#22D3EE" : "#0891B2";
  const green = isDark ? "#34D399" : "#059669";

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${bg}; }

    @keyframes sp-spin {
      to { transform: rotate(360deg); }
    }

    .sp-container {
      padding: 16px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .sp-header {
      margin-bottom: 16px;
    }

    .sp-header h1 {
      font-size: 18px;
      font-weight: 700;
      color: ${text};
      margin: 0 0 4px;
    }

    .sp-header p {
      font-size: 13px;
      color: ${dim};
      margin: 0;
    }

    .sp-cards {
      flex: 1;
    }

    .sp-card {
      background: ${surface};
      border: 1px solid ${border};
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 12px;
      transition: border-color 0.15s ease;
    }

    .sp-card:hover {
      border-color: ${cyan}40;
    }

    .sp-card-name {
      font-size: 14px;
      font-weight: 600;
      color: ${text};
      margin: 0 0 8px;
    }

    .sp-card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .sp-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 6px;
      background: ${cyan}18;
      color: ${cyan};
    }

    .sp-badge--green {
      background: ${green}18;
      color: ${green};
    }

    .sp-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: ${cyan};
      color: ${isDark ? "#0C0F1A" : "#FFFFFF"};
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s ease;
      text-decoration: none;
    }

    .sp-cta:hover {
      opacity: 0.9;
    }

    .sp-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 0;
      color: ${dim};
      font-size: 13px;
      gap: 8px;
    }

    .sp-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid ${border};
      border-top-color: ${cyan};
      border-radius: 50%;
      animation: sp-spin 0.6s linear infinite;
    }

    .sp-empty {
      text-align: center;
      padding: 48px 16px;
      color: ${dim};
      font-size: 13px;
    }

    .sp-footer {
      padding: 16px 0 8px;
      text-align: center;
      border-top: 1px solid ${border};
      margin-top: 12px;
    }

    .sp-footer a {
      color: ${muted};
      font-size: 11px;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .sp-footer a:hover {
      color: ${cyan};
    }
  `;
}
