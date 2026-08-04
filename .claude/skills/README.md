# Launch-readiness skills pack

28 on-demand `/skills` + a CI gate that runs the important ones automatically.
The guiding principle: **a check you have to remember to run is strictly worse
than a gate that runs on every push.** So the heavy, objective checks are wired
into `.github/workflows/launch-gate.yml`; the judgment-heavy ones stay as
on-demand skills you invoke as `/name`.

## How to use
- Type `/smoke`, `/bundle`, `/a11y`, etc. in Claude Code. Most also auto-invoke
  when your request matches their description (the `[manual]` ones don't — they
  spin a build/server, so they only run when you ask).
- `$ARGUMENTS` narrows scope where an `argument-hint` is shown, e.g.
  `/contrast pricing-section` or `/meta /for/restaurants`.

## Model pinning
Cheap mechanical passes run on **Haiku 4.5**; reasoning-heavy audits on
**Opus 4.8**; the middle on **Sonnet**. This keeps token cost down at scale
without dumbing down the audits that actually need to reason.

## Tags
- `[gate]` — also enforced in CI (see mapping below). The skill is the local
  mirror; CI is the backstop.
- `[cmd]` — on-demand only.
- `[once]` — a launch-time pass you can retire afterward.
- `[manual]` — `disable-model-invocation: true`; runs a build/server/baseline, so
  it never auto-fires.
- `[inject]` — feeds real command output into the prompt via `!` shell-injection;
  the exact `Bash(...)` matcher is pre-approved in `allowed-tools`.

## The pack

### A — Actually works (backend + data + functional)
| Skill | Tags | Model | What it checks |
|---|---|---|---|
| `/smoke` | gate·inject·manual | sonnet | Playwright critical paths (auth, CRUD, flows); fail on 4xx/5xx, console errors, hydration mismatches |
| `/rls-audit` | cmd | opus | RLS as defense-in-depth (Supabase advisors) + no client key leak; notes JWT is the real boundary |
| `/api-contract` | cmd | opus | Every `/api/v1` route: validation, status codes, error envelope, **auth enforced** |
| `/env-audit` | gate | sonnet | Required env vars present; nothing sensitive behind `NEXT_PUBLIC_` |
| `/typecheck` | gate·inject | haiku | `tsc --noEmit` + escape-hatch count (`any`/`@ts-ignore`/`as`) |
| `/forms` | cmd | sonnet | Client+server validation, error/success states, spam protection, persists to DB |
| `/error-states` | cmd | haiku | `error/not-found/loading.tsx` coverage; graceful DB-down degradation |
| `/broken-links` | cmd | haiku | 404s, broken images, redirect chains, dead links (seeded from sitemap) |

### B — Speed + Core Web Vitals
| Skill | Tags | Model | What it checks |
|---|---|---|---|
| `/lighthouse` | gate·inject·manual | sonnet | Lighthouse CI (desktop preset), budget-gated |
| `/cwv` | cmd | opus | LCP<2.5s, INP<200ms, CLS<0.1; names the LCP element + worst shifts |
| `/bundle` | cmd·inject·manual | opus | Oversized chunks, dup deps, `"use client"` leakage, tree-shaking |
| `/images` | cmd | haiku | `next/image` usage, AVIF/WebP, explicit dims, lazy-load |
| `/caching` | cmd | opus | Static/dynamic boundaries intentional; no accidental `force-dynamic` |

### C — UX + visual polish
| Skill | Tags | Model | What it checks |
|---|---|---|---|
| `/responsive` | cmd·manual | sonnet | Breakpoint screenshots; overflow, grids, 44px touch targets, safe-area |
| `/a11y` | gate·manual | sonnet | axe-core + Lighthouse a11y, WCAG 2.2 AA, keyboard/focus/ARIA |
| `/contrast` | cmd | haiku | WCAG AA contrast on tokens + components (dark theme) |
| `/loading-ux` | cmd | haiku | Skeletons on async surfaces, no layout jump/empty-flash |
| `/empty-states` | cmd | haiku | Every list/dashboard has empty/error/first-run states |
| `/visual-regression` | cmd·manual | sonnet | Playwright screenshot baseline so diffs can't silently break visuals |
| `/copy-pass` | once | haiku | Proofread microcopy/CTAs, kill placeholder/lorem |

### D — Draw traffic naturally (SEO + measurement)
| Skill | Tags | Model | What it checks |
|---|---|---|---|
| `/seo-tech` | gate | sonnet | sitemap/robots/canonical correct; noindex scoped to auth pages only |
| `/meta` | cmd | haiku | Unique title/description, OG+Twitter cards w/ images, favicon |
| `/schema` | cmd | opus | JSON-LD (Organization/SoftwareApplication/Breadcrumb/FAQ) validated |
| `/internal-links` | cmd | opus | Orphan pages, ≤3-click depth, descriptive anchors, hub/spoke |
| `/analytics` | cmd | opus | PostHog/Vercel/pixels fire once, first-touch attribution, zero PII |

### E — Security + honorable mentions
| Skill | Tags | Model | What it checks |
|---|---|---|---|
| `/security` | gate | opus | CSP + headers audit, rate-limiting on public routes, CVEs |
| `/motion` | cmd | haiku | `prefers-reduced-motion` honored, 60fps (transform/opacity) |
| `/seo-content` | cmd | opus | Heading hierarchy, keyword coverage, content depth |

## CI gate mapping (`.github/workflows/launch-gate.yml`)
| CI job | Covers | Verified |
|---|---|---|
| `static-guards` | `/env-audit`, `/seo-tech` (source), `/security` (headers) | ✅ runs green locally |
| `skills-validate` | keeps this pack loadable | ✅ runs green locally |
| `e2e-smoke` | `/smoke` | ⚠️ needs Postgres+Redis services (provided) — tune on first run |
| `lighthouse` | `/lighthouse`, `/a11y`, `/cwv` | ⚠️ tune budgets in `lighthouserc.json` on first run |

Already covered by existing workflows (not duplicated here): `/typecheck` →
`ci.yml`; `/security` CVEs/licenses → `security.yml`. Runtime-only or
credential-gated gates (`/analytics`, `/rls-audit` via Supabase) and
baseline-dependent ones (`/visual-regression`) run as on-demand skills until you
wire their secrets/baselines.

## Tuning the gate
- **Lighthouse budgets** live in `lighthouserc.json`. They start conservative
  (a11y/SEO ≥ 0.9 hard-fail; perf ≥ 0.75 warn). Tighten as the site improves —
  the point is to fail on *regression*, so ratchet up, never down silently.
- **e2e-smoke** boots the API server (`:4000`) against the Postgres/Redis service
  containers. If your suite needs seed data, add a seed step before `test:e2e`.
- The two `.mjs` guards under `scripts/ci/` are plain Node (no deps) — run them
  locally any time with `node scripts/ci/launch-checks.mjs` and
  `node scripts/ci/validate-skills.mjs`.
