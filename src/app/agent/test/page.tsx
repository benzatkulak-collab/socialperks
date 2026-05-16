import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { McpSandbox } from "@/components/agent/mcp-sandbox";

export const metadata: Metadata = {
  title: "Try the MCP server in your browser — Social Perks",
  description:
    "Self-serve sandbox for the Social Perks MCP server. Pick a tool, fill in the args, see the real JSON-RPC response. No signup, no API key required for read tools.",
  // Indexable — this is one of the highest-leverage agent-developer
  // landing surfaces, optimized to convert curious developers into
  // actual users in under 60 seconds.
};

export default function AgentTestPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <Nav />

      <main id="main-content" className="mx-auto max-w-4xl px-4 pt-28 pb-24 sm:px-6 sm:pt-32 lg:px-8">
        {/* Hero */}
        <section className="mb-12">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Live sandbox
          </p>
          <h1 className="font-heading text-[clamp(2rem,5vw,3.5rem)] italic leading-[1.1] text-brand-white">
            Try the MCP server{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              right now
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base text-brand-dim leading-relaxed sm:text-lg">
            Pick a tool, hit Send, see the real response. No signup, no API key
            needed for read tools. This is the same endpoint your agent will
            call — <code className="rounded bg-brand-surface px-1.5 py-0.5 text-xs text-brand-cyan">https://socialperks.app/api/mcp</code>.
          </p>
        </section>

        <McpSandbox />

        {/* Next steps */}
        <section className="mt-16 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 sm:p-8">
          <h2 className="font-heading text-2xl italic text-brand-white mb-4">
            Liked what you saw?
          </h2>
          <ul className="space-y-3 text-sm text-brand-text">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 text-xs text-brand-cyan" aria-hidden="true">1</span>
              <span>
                <Link href="/#install" className="text-brand-cyan hover:text-brand-white underline-offset-4 hover:underline transition-colors">
                  Install in Claude Desktop
                </Link>{" "}
                in 30 seconds — copy a snippet, paste into config, restart.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 text-xs text-brand-cyan" aria-hidden="true">2</span>
              <span>
                For write tools (createCampaign, submitProof…) you&apos;ll need an API
                key. Start the OAuth flow at{" "}
                <a href="/agent/authorize?agent_name=My%20Agent&scope=read.campaigns,write.campaigns&redirect_uri=https://example.com&state=x" className="text-brand-cyan hover:text-brand-white underline-offset-4 hover:underline transition-colors">
                  /agent/authorize
                </a>{" "}
                or read the{" "}
                <a href="https://github.com/benzatkulak-collab/socialperks/blob/main/AGENTS.md" className="text-brand-cyan hover:text-brand-white underline-offset-4 hover:underline transition-colors">
                  AGENTS.md
                </a>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 text-xs text-brand-cyan" aria-hidden="true">3</span>
              <span>
                Runnable agent examples (TypeScript, ~200 lines, no Anthropic SDK):{" "}
                <a href="https://github.com/benzatkulak-collab/socialperks/tree/main/examples" className="text-brand-cyan hover:text-brand-white underline-offset-4 hover:underline transition-colors">
                  examples/
                </a>.
              </span>
            </li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
