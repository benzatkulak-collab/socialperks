import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Webhooks — Social Perks Developers",
  description:
    "Subscribe to real-time events from Social Perks. Signed payloads, retries, code examples in Node.js, Python, PHP, and Ruby.",
  openGraph: {
    title: "Social Perks Webhooks",
    description:
      "Real-time event delivery with HMAC signatures and idempotent retries.",
    url: "https://socialperks.onrender.com/webhooks",
    siteName: "Social Perks",
    type: "website",
  },
};

interface WebhookEvent {
  name: string;
  description: string;
  payload: Record<string, unknown>;
}

const EVENTS: WebhookEvent[] = [
  {
    name: "campaign.created",
    description: "Fires when a new campaign is created in any account.",
    payload: {
      id: "evt_01HK3...",
      type: "campaign.created",
      created: 1715300000,
      data: {
        campaignId: "cmp_01HK3...",
        businessId: "biz_yoga",
        name: "Spring Yoga Push",
        tier: "high-impact",
        status: "draft",
      },
    },
  },
  {
    name: "submission.received",
    description: "Fires when a customer submits proof of action.",
    payload: {
      id: "evt_01HK3...",
      type: "submission.received",
      created: 1715300100,
      data: {
        submissionId: "sub_01HK3...",
        campaignId: "cmp_01HK3...",
        userId: "usr_01HK3...",
        platform: "instagram",
        proofUrl: "https://instagram.com/p/CxYz...",
      },
    },
  },
  {
    name: "submission.approved",
    description: "Fires after a submission passes review.",
    payload: {
      id: "evt_01HK3...",
      type: "submission.approved",
      created: 1715300200,
      data: {
        submissionId: "sub_01HK3...",
        approvedBy: "auto-review",
        score: 0.94,
        rewardCents: 1000,
      },
    },
  },
  {
    name: "submission.rejected",
    description: "Fires when a submission is rejected by reviewer or AI.",
    payload: {
      id: "evt_01HK3...",
      type: "submission.rejected",
      created: 1715300210,
      data: {
        submissionId: "sub_01HK3...",
        reason: "missing_ftc_disclosure",
        reviewer: "auto-review",
      },
    },
  },
  {
    name: "perk.earned",
    description: "Fires when a customer earns a perk reward.",
    payload: {
      id: "evt_01HK3...",
      type: "perk.earned",
      created: 1715300300,
      data: {
        perkId: "prk_01HK3...",
        userId: "usr_01HK3...",
        valueCents: 1000,
        currency: "USD",
        expiresAt: 1717892300,
      },
    },
  },
  {
    name: "perk.redeemed",
    description: "Fires when a customer redeems an earned perk.",
    payload: {
      id: "evt_01HK3...",
      type: "perk.redeemed",
      created: 1715300400,
      data: {
        perkId: "prk_01HK3...",
        userId: "usr_01HK3...",
        redeemedAt: 1715300400,
        location: "store_01",
      },
    },
  },
  {
    name: "perk.expired",
    description: "Fires when an earned perk expires unredeemed.",
    payload: {
      id: "evt_01HK3...",
      type: "perk.expired",
      created: 1717892300,
      data: {
        perkId: "prk_01HK3...",
        userId: "usr_01HK3...",
        expiredAt: 1717892300,
      },
    },
  },
  {
    name: "influencer.matched",
    description: "Fires when the matching engine pairs an influencer with a campaign.",
    payload: {
      id: "evt_01HK3...",
      type: "influencer.matched",
      created: 1715300500,
      data: {
        campaignId: "cmp_01HK3...",
        influencerId: "inf_01HK3...",
        score: 0.87,
      },
    },
  },
  {
    name: "fraud.flagged",
    description: "Fires when the fraud engine flags suspicious activity.",
    payload: {
      id: "evt_01HK3...",
      type: "fraud.flagged",
      created: 1715300600,
      data: {
        submissionId: "sub_01HK3...",
        signals: ["duplicate_image", "low_account_age"],
        severity: "high",
      },
    },
  },
  {
    name: "campaign.launched",
    description: "Fires when a campaign goes live.",
    payload: {
      id: "evt_01HK3...",
      type: "campaign.launched",
      created: 1715300700,
      data: {
        campaignId: "cmp_01HK3...",
        launchedAt: 1715300700,
      },
    },
  },
];

const NODE_EXAMPLE = `import crypto from "crypto";
import express from "express";

const app = express();
const SECRET = process.env.SOCIAL_PERKS_WEBHOOK_SECRET;

app.post("/webhooks/social-perks", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.header("X-SocialPerks-Signature");
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(req.body)
    .digest("hex");

  if (signature !== expected) return res.status(401).send("invalid signature");

  const event = JSON.parse(req.body.toString());
  console.log("event:", event.type, event.data);
  res.status(200).send("ok");
});

app.listen(3000);`;

const PYTHON_EXAMPLE = `import hmac
import hashlib
import os
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.environ["SOCIAL_PERKS_WEBHOOK_SECRET"].encode()

@app.post("/webhooks/social-perks")
def receive():
    signature = request.headers.get("X-SocialPerks-Signature", "")
    expected = hmac.new(SECRET, request.data, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        abort(401)
    event = request.get_json()
    print("event:", event["type"], event["data"])
    return "ok", 200`;

const PHP_EXAMPLE = `<?php
$secret = getenv("SOCIAL_PERKS_WEBHOOK_SECRET");
$payload = file_get_contents("php://input");
$signature = $_SERVER["HTTP_X_SOCIALPERKS_SIGNATURE"] ?? "";
$expected = hash_hmac("sha256", $payload, $secret);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit("invalid signature");
}

$event = json_decode($payload, true);
error_log("event: " . $event["type"]);
http_response_code(200);
echo "ok";`;

const RUBY_EXAMPLE = `require "sinatra"
require "openssl"
require "json"

SECRET = ENV.fetch("SOCIAL_PERKS_WEBHOOK_SECRET")

post "/webhooks/social-perks" do
  payload = request.body.read
  signature = request.env["HTTP_X_SOCIALPERKS_SIGNATURE"]
  expected = OpenSSL::HMAC.hexdigest("SHA256", SECRET, payload)

  halt 401, "invalid signature" unless Rack::Utils.secure_compare(expected, signature)

  event = JSON.parse(payload)
  logger.info "event: #{event['type']}"
  status 200
  "ok"
end`;

const CODE_TABS: { lang: string; code: string }[] = [
  { lang: "Node.js", code: NODE_EXAMPLE },
  { lang: "Python", code: PYTHON_EXAMPLE },
  { lang: "PHP", code: PHP_EXAMPLE },
  { lang: "Ruby", code: RUBY_EXAMPLE },
];

export default function WebhooksPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Back to home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/10">
              <span className="font-heading text-lg text-brand-cyan">S</span>
            </div>
            <span className="font-heading text-xl italic text-brand-white">
              Social Perks
            </span>
          </Link>
          <Link
            href="/developers"
            className="text-sm text-brand-muted transition-colors hover:text-brand-text"
          >
            &larr; Developers
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
        {/* Hero */}
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
            Webhooks
          </div>
          <h1 className="mt-4 font-heading text-3xl italic leading-tight text-brand-white sm:text-5xl">
            Real-time events, signed and reliable.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-brand-dim">
            Subscribe to outgoing webhooks to react to campaign activity,
            submissions, perk redemptions, and fraud signals as they happen.
          </p>
        </section>

        {/* Quick facts */}
        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-brand-muted">
              Signature
            </div>
            <div className="mt-1 font-semibold text-brand-text">
              HMAC-SHA256
            </div>
            <p className="mt-2 text-sm text-brand-dim">
              Header: <code className="font-mono text-brand-cyan">X-SocialPerks-Signature</code>
            </p>
          </div>
          <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-brand-muted">
              Retries
            </div>
            <div className="mt-1 font-semibold text-brand-text">
              Exponential backoff
            </div>
            <p className="mt-2 text-sm text-brand-dim">
              Up to 8 attempts over 24 hours on non-2xx responses.
            </p>
          </div>
          <div className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-brand-muted">
              Timeout
            </div>
            <div className="mt-1 font-semibold text-brand-text">
              5 seconds
            </div>
            <p className="mt-2 text-sm text-brand-dim">
              Respond fast, queue work async. 200/204 = success.
            </p>
          </div>
        </section>

        {/* Events */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Events
          </h2>
          <p className="mt-2 text-brand-dim">
            Pick the events you want and we&apos;ll POST them to your endpoint.
          </p>
          <div className="mt-8 space-y-4">
            {EVENTS.map((e) => (
              <div
                key={e.name}
                className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="font-mono text-sm font-semibold text-brand-cyan">
                    {e.name}
                  </code>
                  <span className="rounded-full border border-brand-border/60 bg-brand-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-muted">
                    POST
                  </span>
                </div>
                <p className="mt-2 text-sm text-brand-dim">{e.description}</p>
                <pre className="mt-3 overflow-x-auto rounded-md border border-brand-border/40 bg-brand-bg/80 p-4 font-mono text-xs leading-relaxed text-brand-text">
                  {JSON.stringify(e.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Code examples */}
        <section className="mt-20">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Receive and verify
          </h2>
          <p className="mt-2 text-brand-dim">
            Always verify the signature before trusting a payload.
          </p>
          <div className="mt-8 space-y-6">
            {CODE_TABS.map((t) => (
              <div
                key={t.lang}
                className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6"
              >
                <div className="font-mono text-[11px] uppercase tracking-wider text-brand-cyan">
                  {t.lang}
                </div>
                <pre className="mt-3 overflow-x-auto rounded-md border border-brand-border/40 bg-brand-bg/80 p-4 font-mono text-xs leading-relaxed text-brand-text">
                  {t.code}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Signature verification */}
        <section className="mt-20">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Signature verification
          </h2>
          <div className="mt-6 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <ol className="space-y-3 text-sm leading-relaxed text-brand-dim">
              <li>
                <span className="font-semibold text-brand-text">
                  1. Read the raw body.
                </span>{" "}
                Do not parse JSON before computing the HMAC — even whitespace
                changes break the signature.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  2. Compute HMAC-SHA256.
                </span>{" "}
                Use your webhook secret (from dashboard &rarr; Developers &rarr;
                Webhooks) as the key, the raw body as the message.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  3. Constant-time compare.
                </span>{" "}
                Use a timing-safe comparator (
                <code className="font-mono text-brand-cyan">
                  hmac.compare_digest
                </code>
                ,{" "}
                <code className="font-mono text-brand-cyan">
                  crypto.timingSafeEqual
                </code>
                ) to avoid leaking the signature.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  4. Check freshness.
                </span>{" "}
                Reject events older than 5 minutes (
                <code className="font-mono text-brand-cyan">
                  X-SocialPerks-Timestamp
                </code>
                ) to prevent replay attacks.
              </li>
            </ol>
          </div>
        </section>

        {/* Retry/timeout */}
        <section className="mt-20">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Retry &amp; timeout policy
          </h2>
          <div className="mt-6 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <ul className="space-y-3 text-sm leading-relaxed text-brand-dim">
              <li>
                <span className="font-semibold text-brand-text">
                  Success.
                </span>{" "}
                Any 2xx response within 5 seconds counts as delivered.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Failure.
                </span>{" "}
                Non-2xx, timeout, or connection error triggers a retry.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Backoff.
                </span>{" "}
                Up to 8 attempts spaced exponentially over 24 hours: 1m, 5m,
                15m, 1h, 3h, 6h, 12h, 24h.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Idempotency.
                </span>{" "}
                Each delivery has the same{" "}
                <code className="font-mono text-brand-cyan">id</code>. Use it
                as your dedup key — retries are expected.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Dead-letter.
                </span>{" "}
                After the final failure, events appear in your dashboard&apos;s
                webhook log for manual replay.
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20">
          <div className="rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-brand-green/5 p-8 text-center sm:p-12">
            <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
              Start receiving events
            </h2>
            <p className="mt-3 text-brand-dim">
              Configure your endpoint in the dashboard and we&apos;ll send a
              test event to confirm.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/developers"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-3 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
              >
                Open developer hub &rarr;
              </Link>
              <Link
                href="/api/v1/docs/ui"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface/40"
              >
                API reference
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
