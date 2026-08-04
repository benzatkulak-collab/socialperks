---
name: analytics
description: >-
  Verify product measurement is live and correct — PostHog funnel events fire
  exactly once, first-touch attribution is attached, Web Vitals reach a RUM
  sink, consent handling exists, and ZERO PII leaks (identify must use account
  id, never email). Use whenever the user mentions analytics, tracking,
  PostHog, funnel events, conversion tracking, attribution, Web Vitals, event
  double-firing, or "is our tracking working" — even without naming a tool.
  This is a launch gate; run it before shipping anything touching the funnel.
argument-hint: ""
allowed-tools: Read, Grep, Glob
model: opus
---

# Analytics & measurement audit (launch gate)

Why this matters: if measurement is wrong you're flying blind on the ONLY thing
that matters pre-launch — validated demand. A double-fired event or a dark
PostHog key silently corrupts every conversion number you'd bet the roadmap on.
Run this on demand — there is no CI job for it. The Launch Gate covers
static-guards, skills-validate, e2e-smoke and lighthouse only.

## Where measurement lives
- `src/lib/analytics.ts` — typed funnel events; `track()` merges attribution,
  `identify()` sets the user, and it no-ops (with a warn) when the key is unset.
- `src/lib/attribution.ts` — `captureFirstTouch()` + `getAttribution()`
  (first-touch channel, merged into every event).
- `src/components/shared/posthog-loader.tsx` — loads PostHog, gated on
  `NEXT_PUBLIC_POSTHOG_KEY`.
- `src/components/shared/tracking-pixels.tsx` — Meta/GA, gated on their env
  vars, fire Purchase on paid conversion.
- `@vercel/analytics` wired in `src/app/layout.tsx`.

## Checks (each is PASS/FAIL)
1. **KEY PRESENT — top risk**: if `NEXT_PUBLIC_POSTHOG_KEY` is unset in the
   deploy env, the whole funnel goes dark (track() no-ops). Flag this first and
   loudest; confirm it's set in the production environment, not just referenced.
2. **Fire exactly once**: each funnel event fires ONE time per real user action.
   Hunt for `track(...)` inside a `useEffect`/render path with no guard, or in a
   component that re-mounts — the classic double-fire. Verify effect deps + a
   fired-once ref/flag where needed.
3. **Attribution attached**: every event carries `getAttribution()` output
   (first-touch channel). Confirm `track()` merges it and
   `initAttribution()`/`captureFirstTouch()` runs on first load.
4. **Web Vitals → RUM**: Core Web Vitals (LCP/INP/CLS) are captured and piped to
   a sink (PostHog/Vercel), not dropped. Flag if there's no reporter.
5. **Consent**: consent/opt-out handling exists before tracking fires where
   required. Flag if events fire unconditionally with no consent gate.
6. **ZERO PII**: `identify()` MUST use the account id, never email; no event
   props carry email/name/raw PII. Grep `identify(` and event prop payloads and
   confirm the arg is an id.

## Output
PASS/FAIL table for the 6 checks. Lead with the `NEXT_PUBLIC_POSTHOG_KEY` status
as the top risk. For each FAIL: file:line, the concrete defect (e.g. "track()
in unguarded effect at X → double-fires"), and the exact fix.
