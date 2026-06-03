# Social Perks — Architecture & Code Health Audit (Phase 4)

**Auditor stance:** Principal architect, evidence-based, read-only. No code changed.
**Date:** 2026-06-02
**Worktree:** `/Users/benzatkulak/Desktop/social-perks/.claude/worktrees/charming-morse-444ee5`
**Status of product:** PRE-LAUNCH, zero real external users. Vercel (socialperks.app) + Supabase Postgres.

## Headline numbers (verified)

| Metric | Value | How measured |
|---|---|---|
| `src/` LOC (.ts/.tsx) | **168,885** | `find src -name '*.ts*' \| xargs wc -l` |
| `api/` LOC (separate Hono backend) | **63,006** | `find api -name '*.ts' \| xargs wc -l` |
| `packages/` LOC | 1,769 | same |
| Next.js `route.ts` files | **103** (92 under v1, 4 under v2) | `find src/app/api -name route.ts` |
| `src/lib` subdirectories | 48 | `find src/lib -maxdepth 1 -type d` |
| `src/` total .ts/.tsx files | 592 | find |
| Confirmed fully-dead module LOC (sampled) | **~10,500** | see Finding 4 |
| `api/` (dead second backend) LOC | **63,006** | see Finding 1 |
| **Deletable dead code, conservative** | **~73,500 LOC (~30% of repo)** | api/ + dead src modules |

The codebase is roughly **2–3x larger than the working product**. For a 0-user pre-launch app, the dominant code-health problem is not bugs — it is *volume of unfinished, duplicated, and speculative code* that no traffic exercises and that the founder still has to read, build, and reason about.

---

## 1. The two-backend problem — `api/` is DEAD. Delete it. [CRITICAL, effort M, quick-win-ish]

`api/` is a complete second backend: a Hono service (`@social-perks/api`, `type: module`, deps `hono`, `@hono/node-server`, `ioredis`) with its own routes, 53 lib files, and ~63K LOC.

**Evidence it is dead / not in any deploy path:**

- **Nothing in `src/` imports it.** `grep -rn "api/src/lib\|api/src/routes" src/ packages/ scripts/` → zero hits. `grep` for `../api/` imports in src → zero.
- **`.vercelignore` line: `/api/`** — explicitly excluded from the live Vercel deploy. Comment in that file: *"Exclude the standalone Hono API backend from Vercel deploys… Next.js routes in src/app/api/v1/* serve the production API."*
- **`Dockerfile` never copies it.** Build stage copies only `packages/`, `src/`, `public/`, and config files (`Dockerfile` lines ~25–30). `api/` is absent.
- **It is not a workspace.** Root `package.json` `workspaces: ["packages/*"]` — `api/*` is NOT listed, so root `npm ci` never installs its deps. It has its own separate `package.json`/dependency tree (`api/package.json`).
- **`tsconfig.json` excludes it** (`"exclude": ["node_modules", "api", …]`) — it is not even typechecked by the main project.
- **`next.config.js` rewrite to an external API is conditional and off by default:** `if (!apiUrl) return [];` — `API_URL` is unset in normal operation, so requests go to in-process Next routes, never to `api/`.
- **Git history confirms abandonment.** `git log -- api/`: 9 commits, the LAST being `30bf540 Replace socialperks.io with socialperks.app` (2026-05-28) — a global domain rename, i.e. it was only touched by a sed-style sweep, not real work. The real api/ work stopped at `853e95b`/`a7ebc5d` (security + typecheck fixes) well before that. The arc `0e64288 Extract API into standalone Hono service, remove Next.js API routes` → later re-adding Next routes shows an **abandoned migration**: the team extracted to Hono, then reversed course and went back to Next API routes, but never deleted the Hono experiment.

**Duplication quantified:** Of 53 non-test lib files in `api/src/lib`, **50 share a basename with a file in `src/lib`** (`comm -12` of the two basename lists). Duplicated engines include: `ai-engine`, `ai-agent`, `campaign-state-machine`, `compliance-engine`, `embedding-engine`/`embedding-system`, `financial-ledger`, `fraud-detection`, `fraud-pipeline`, `graph-engine`, `matching-engine`, `plugin-system`, `stripe`, `seed`, `ideas`, `sync-engine`, `verification-engine`, `exchange`, plus security (`csrf`, `rate-limiter`, `sanitize`, `validate`), db (`prisma`, `schema`, `migrations`, `connection`, `repositories`), and infra (`sharding`, `soc2`, `observability`, `disaster-recovery`). This is two parallel universes of the same engines that will inevitably drift.

**Classification:** dead-or-abandoned.
**Recommendation: DELETE `api/` entirely** (and the `api:*` scripts in root `package.json`, and the `/api/` line in `.vercelignore`). Rationale: it is not deployed, not imported, not typechecked, duplicates the live engines, and its existence doubles the surface area a solo founder must maintain and audit. If a standalone API service is ever wanted, it should be re-derived from the *live* `src/lib` engines, not resurrected from this stale fork. Keeping it "just in case" is a net negative: every security finding now has to be fixed twice, and a reader cannot tell which copy is authoritative.

Effort is M only because of git hygiene / making sure no script secretly calls it; the deletion itself is trivial (`git rm -r api/`).

---

## 2. v1 vs v2 API — v2 is speculative, unused, delete or shelve [HIGH, effort S, quick win]

`src/app/api/v2/` contains 4 routes: `auth`, `campaigns`, `submissions`, `migration` (356 LOC total).

**What v2 is:** thin version-translation wrappers. `v2/campaigns/route.ts` header: *"Thin wrapper: transforms v2 requests to v1 internally, delegates to existing campaign logic, transforms response back to v2."* It imports `GET/POST/PUT as v1GET/...` from `../../v1/campaigns/route` and runs `transformRequest`/`transformResponse` from `src/lib/api/versioning.ts`.

**Evidence it is dead (not called by the product):**
- `grep -rln "api/v2\|/v2/"` across all of `src/` returns **only** the v2 route files themselves, `src/lib/api/versioning.ts`, `src/lib/api/v2-transforms.ts`, and one test (`versioning.test.ts`). 
- **No frontend caller:** `src/components`, `src/lib/api/client.ts`, `src/lib/hooks` contain zero `/v2/` references. The API client deals only in `/api/v1/*`.
- **No e2e / scripts / load-test caller** (`grep -rln api/v2 e2e/ scripts/ load-tests/ examples/` → empty).

`versioning.ts` even emits a deprecation header claiming *"API v1 is deprecated and will be removed on 2026-12-31. Please migrate to v2"* — a deprecation notice for an API with zero external consumers, pointing users to a v2 nobody calls. This is process theater.

**Classification:** speculative-for-0-users.
**Recommendation:** delete `v2/`, `versioning.ts`, `v2-transforms.ts`, and their tests. API versioning is a thing you add when you have external consumers and a breaking change — not before your first user. If you want to keep the *pattern* as a reference, move it to `docs/`. Quick win.

---

## 3. Persistence is a lie for most routes — module-level `Map`s wiped on every serverless cold start [CRITICAL, effort L]

The product claims (CLAUDE.md) "Postgres persistence." Reality: **only 15 of 92 v1 routes touch the DB**; **19 v1 routes hold state in process-level `Map`/array globals** that Vercel wipes between invocations.

**Evidence:**
- `grep -rln "lib/db\|postgres\|prisma\|sql" src/app/api/v1 --include=route.ts` → **15** files.
- `grep -rln "new Map()\|globalThis\.\|= \[\];" src/app/api/v1 --include=route.ts` → **19** files: `drip`, `exchange/enroll`, `exchange/market`, `businesses/poster`, `referrals/me`, `digest`, `admin/founder-overview`, `admin/programs`, `admin/stats`, `feedback`, **`programs`**, **`programs/[programId]/progress`**, **`programs/[programId]/cashback`**, **`programs/[programId]/members`**, `ai/review`, `campaigns`, `cron/agents`, `cron/onboarding-drip`.

**The worst offender is a core product surface — Perk Programs.** `src/lib/programs/store.ts` (line 4: *"Shared types and in-memory stores for perk programs"*):
```
export const programs = new Map<string, PerkProgram>();          // line 77
export const programMembers = new Map<string, ProgramMember>();   // line 78
export const programSubmissions = new Map<string, ProgramSubmission>(); // line 79
export const payouts = new Map<string, Payout>();                 // line 80
```
Every perk program, member enrollment, action submission, and cashback payout lives in RAM. On Vercel, each cold start (and each new lambda instance under concurrency) starts empty. A business that creates a program and a customer who enrolls will see their data **vanish unpredictably**. The exchange feature is the same: `src/app/api/v1/exchange/orders/route.ts:25 const ordersStore = new Map<string, Order>();` — orders/trades evaporate.

`src/lib/billing/store.ts` shows the team *knows* the right shape — it imports `db, InMemoryConnection` from `@/lib/db/connection` and has a comment (line ~94) *"Then wire it into src/lib/db/schema.ts and migrate"* — i.e. an explicit TODO that was never finished, while `subscriptions = new Map()` (line 96) is the actual storage.

**Classification:** broken (for any feature that needs to survive a request). The redemption/auth/subscription durability work noted in project memory fixed the *auth & billing* slices; **programs and exchange remain in-memory and will lose data in production.**
**Recommendation:** Treat "does this route's data survive a cold start?" as a launch gate. Migrate Perk Programs to `db/repositories.ts` before any real business touches it. Until then, these features are demos, not product. This is the single biggest *functional* architecture risk; the dead-code items above are cheaper to fix but this one loses customer data.

---

## 4. Root-`*-engine.ts` vs subdir duplication — multiple independent impls, mostly dead [HIGH, effort M]

For each suspected pair I grepped the real import graph (non-test importers across all of `src/`). Results:

| Concept | Root file (LOC) | Non-test importers of root | Subdir | Verdict |
|---|---|---|---|---|
| **sync** | `sync-engine.ts` (814) | **0** | `sync/index.ts` (45KB CRDT, "Production-Grade") — **0 non-test importers** | **BOTH DEAD.** Two independent offline-sync implementations, neither used. |
| **graph** | `graph-engine.ts` (898) | 1 (`graph/discovery.ts:13 import { socialGraph } from "../graph-engine"`) | `graph/discovery.ts` used by 1 route (`api/v1/graph`) | Root kept alive only by one subdir file → one route. `ml/social-graph.ts` (992 LOC) = **0 importers, dead.** Three graph implementations, one barely-used chain. |
| **embedding** | `embedding-engine.ts` (1045) | 1 (`search/semantic-search.ts`) | `ml/embedding-system.ts` (38KB) — **0 importers, dead** | Two vector-embedding engines; the subdir one is dead. |
| **compliance** | `compliance-engine.ts` (1080) | 3 (`ai/review`, `legal` routes, `lib/exchange.ts`†) | `compliance/index.ts` (45KB) — **0 importers, dead** | Two compliance engines; the 45KB subdir version is dead. († one importer is itself dead — see Finding 5.) |
| **verification** | `verification-engine.ts` (1776) | 1 (`ai/review`) | `verification/` (9 files, ~140KB) used by `ai/review` + `submissions` | Root + subdir BOTH partly used by `ai/review` simultaneously — overlapping responsibilities, unclear ownership. |
| **campaign-state-machine** | `campaign-state-machine.ts` (748) | many (14 files) | `campaign-state-machine/persist.ts` used by 2 | Root is genuinely live; subdir `persist.ts` is the only legit split. **This is the one healthy pair.** |

**Pattern (root cause):** the same engine was rewritten as a subdir "v2" (often larger and labeled "Production-Grade"/"CRDT"), the new version was never wired in, and the old root file kept the one or two real call sites. The repo accumulated **2–3 implementations per concept** with no single source of truth. `sync` is the cleanest example of pure waste: ~1,659 LOC across two files, zero usage.

**Recommendation:** For each concept, pick the implementation that has real importers, delete the others, and (if the subdir was meant to supersede the root) finish that migration or abandon it explicitly. Concretely deletable now with zero call-site changes: `sync-engine.ts` + `sync/` (both dead), `ml/embedding-system.ts`, `ml/social-graph.ts`, `compliance/index.ts`.

---

## 5. Fully-dead modules (zero non-test importers) — ~10.5K LOC, delete on sight [HIGH, effort S, quick win]

Verified by exact-path import grep (excluding tests and self):

| Module | LOC | Importers | Note |
|---|---|---|---|
| `src/lib/ideas.ts` | 1,075 (**177 KB**) | **0** | Giant "1000 platform ideas" blob. CLAUDE.md says it's used; it is not. |
| `src/lib/exchange.ts` | 1,312 | **0** | The exchange *engine*. The 5 `exchange/*` routes (1,040 LOC) reimplement order/trade logic inline against their own in-memory Maps and never import this. Dead engine + duplicated route logic. |
| `src/lib/sync-engine.ts` | 814 | 0 | see Finding 4 |
| `src/lib/sync/index.ts` | ~845 (45 KB) | 0 | see Finding 4 |
| `src/lib/infrastructure/soc2.ts` | 1,424 | **0** | SOC2 controls engine, for a 0-user app. |
| `src/lib/infrastructure/disaster-recovery.ts` | 1,168 | **0** | DR orchestration, unused. |
| `src/lib/infrastructure/observability.ts` | 1,076 | **0** | Custom observability layer, unused (real tracing lives in `lib/api/with-request-context.ts`). |
| `src/lib/infrastructure/sharding.ts` | 1,114 | **0** | DB sharding, for a single Supabase instance with 0 users. |
| `src/lib/ml/social-graph.ts` | 992 | 0 | third graph impl |
| `src/lib/config.ts` | 119 | **0** | Central config helper — written, never adopted (see Finding 7). |

**Sampled sum (the big ones): ~10,500 LOC of dead code.** This is a floor, not a ceiling — `multi-tenant/index.ts` (1,580 LOC, 6 importers but likely a closed test-only loop), `financial-ledger.ts` (892, 2 importers), and `plugin-system.ts` (778, 2 importers) are near-dead and worth a second pass.

`packages/sdk` is near-dead too: imported by exactly **2** files (`api/llm-context/route.ts`, `faq-data.ts`). It is not in the Dockerfile copy list (only `packages/shared` is), so if those 2 import sites matter in the container build, that is a latent **build risk** — `packages/sdk` source isn't copied into the image. Verify before next Docker deploy.

**Recommendation:** delete the zero-importer modules. This is the highest ROI cleanup in the repo: ~10K LOC gone, zero behavior change, smaller build, faster typecheck, less to audit.

---

## 6. Bundle / perf risk — LOWER than feared; the giant data files stay server-side [MEDIUM→LOW, effort S]

I traced every giant data file to its importers and checked whether each importer is a Client Component (`"use client"`) or a Server Component.

- `ideas.ts` (177 KB): **0 importers → never bundled at all** (it's just dead weight in the repo, Finding 5).
- `answers-data.ts` (96 KB): imported by `app/sitemap.ts`, `app/answers/page.tsx`, `app/answers/[slug]/page.tsx` — **all Server Components.**
- `industries.ts` (48 KB): imported by `sitemap.ts`, and a dozen `app/**/page.tsx` files + `lib/blog.ts` — **all Server Components.**
- `faq-data`, `guides-data`, `glossary-data`, `comparison-data`, `vs-data`, `best-data`, `playbook-data`: every importer checked is `server:` (no `"use client"` at top).

In the Next.js App Router, Server Component imports execute on the server and are **not shipped to the browser** unless the data is passed as props into a Client Component. I found no client component importing these blobs. So the *browser* bundle is largely spared.

**Residual risk (why not LOW outright):** (a) these blobs still bloat the **serverless function bundles** and cold-start parse time for the SSG/SSR routes that import them; (b) they inflate the repo and the Docker image; (c) it's fragile — the moment someone adds `"use client"` to one of those `page.tsx` files or imports `industries.ts` into a client component, ~48–177 KB lands in the browser with no guardrail. There is no lint rule preventing it.

`platforms.ts`, `types.ts`, `seed.ts` are **2-line re-export stubs** to `@social-perks/shared` (e.g. `export * from "@social-perks/shared/platforms"`) — that explains the "102-byte stubs" in the brief; the real definitions live in `packages/shared/src/`. This is fine and intentional, not a bug. Client components import `@/lib/platforms` (e.g. `business/portal.tsx`); since `platforms` is data + small helpers this is acceptable, but it does ship the 15-platform/107-action dataset to the browser — worth confirming its size is modest.

**Recommendation:** (1) delete `ideas.ts`. (2) For the SEO/marketing blobs, prefer loading from JSON via `fs`/route handlers or a CMS rather than `import`-ing 96 KB TS literals, so they don't sit in function bundles. (3) Add an ESLint `no-restricted-imports` rule forbidding these data modules from `"use client"` files to make the boundary enforceable, not incidental. Low urgency for a 0-user app; do it before scaling content.

---

## 7. Config & env handling — central `config.ts` written then ignored; env reads scattered across 92 files [MEDIUM, effort M]

- `src/lib/config.ts` exists (119 LOC, exports a config object) but has **0 importers**.
- `grep -rln "process.env" src/ (non-test)` → **92 files** read `process.env` directly.

So there is no single validated config surface. Env vars are read ad hoc in 92 places with inconsistent defaulting and no startup validation (e.g. a missing `STRIPE_SECRET_KEY` fails deep inside a request, not at boot). There's also a parallel `src/lib/oauth/env.ts`, so the "where do I configure X" answer is three different places.

**Recommendation:** adopt one validated config module (zod-parsed at startup; the repo already depends on `zod-to-json-schema`), route all `process.env` reads through it, fail fast on missing required vars. Medium effort because of the 92 call sites, but it converts a class of "works on my machine / 502 in prod" bugs (which memory shows you've already hit: checkout 502, missing price env) into boot-time errors.

---

## 8. Over-engineering for 0 users — the dominant theme [HIGH (as strategic risk), effort N/A]

This is the root cause behind Findings 1, 4, 5. The codebase is built as if it serves millions, while serving nobody:

- **Event sourcing** (`events.ts`, `eventStore`) — 6 importers; a full append-only event store driving a state machine, for a CRUD app with no users.
- **CRDT offline sync** (`sync/index.ts`, "Production-Grade", LWW/G-Counter/OR-Set) — 0 users, 0 importers.
- **Multi-tenant** (`multi-tenant/index.ts`, 1,580 LOC), **DB sharding** (1,114 LOC), **SOC2 controls engine** (1,424 LOC), **disaster recovery** (1,168 LOC), **custom observability** (1,076 LOC) — enterprise-scale infra, all 0–6 importers, none load-bearing.
- **Vector embeddings + ML fraud pipeline** (`ml/`: ~155 KB across embedding-system, fraud-pipeline 56 KB, fraud-model, fraud-training, social-graph) — an ML platform with no training data and no users.
- **Plugin system** (778 LOC) — extensibility framework for a product with no extensions and one developer.
- **Exchange / order book** (engine 1,312 LOC dead + 1,040 LOC of routes) — a marketplace with no liquidity.
- **API versioning + deprecation policy** (Finding 2) — for an API with no external consumers.

Meanwhile the **basics are missing**: core features (Perk Programs, Exchange) don't persist (Finding 3); central config is unused (Finding 7); there are 2–3 copies of half the engines (Findings 1, 4).

This is the classic inversion: heavy investment in speculative scale-out infrastructure, under-investment in "does the data survive a request." For a pre-launch solo/small project this is the #1 *strategic* code-health problem — it represents enormous sunk effort that now actively slows iteration (more to build, more to break, more to read) without serving a single user.

**Recommendation:** ruthlessly cut to the spine. The spine is: auth, campaigns, submissions, programs, billing — each backed by Postgres. Everything else (event sourcing, sync, multi-tenant, sharding, soc2, DR, observability, ML, plugins, exchange, API v2) should be deleted or quarantined into a clearly-labeled `experimental/` area excluded from the build, to be revived only when a real user need appears. This isn't aesthetic; every one of these subsystems is a place a security or correctness bug can hide, and you're auditing all of it.

---

## 9. Type safety — GOOD [LOW / positive]

- `tsconfig.json`: `"strict": true`, plus `noUnusedLocals` and `noUnusedParameters`. Solid.
- Escape hatches are rare: `: any` ≈ 6, `as any` ≈ 3, `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck` = **0**, `eslint-disable` = 12 (non-test). For 169K LOC this is excellent discipline.
- The "stub" `platforms.ts`/`types.ts` (102 bytes) are intentional re-exports from `packages/shared` (Finding 6), not missing types. Real types are in `packages/shared/src/types.ts`.

**One real gap:** `tsconfig.json` `"exclude"` lists `"**/__tests__/**"` and `"**/*.test.ts(x)"` — **tests are not typechecked** by the project config. Combined with `api/` also excluded, a large fraction of the repo escapes `tsc`. Tests can rot into type-incorrectness silently. [MEDIUM, effort S] Recommendation: typecheck tests (separate `tsconfig.test.json` or include them); CI memory note already shows test/typecheck are run, but verify tests are actually in the typecheck scope.

---

## 10. Build / Next config — GOOD, no footguns [LOW / positive]

`next.config.js` reviewed in full:
- **No `typescript.ignoreBuildErrors`, no `eslint.ignoreDuringBuilds`.** Build will fail on type/lint errors — correct.
- `output: "standalone"` + `outputFileTracingRoot` anchored — correct for Docker.
- The external-API rewrite is safely gated behind `if (!apiUrl) return [];`.
- **CSP is genuinely hardened**: `connect-src` allowlisted (with an explicit security comment about the previous `https:` wildcard being a data-exfil hole — good catch by whoever fixed it), `object-src 'none'`, `frame-ancestors 'none'`, HSTS preload, `upgrade-insecure-requests`, pixel hosts only injected when the env var is set. This file is a model of doing it right and stands in stark contrast to the dead-code sprawl elsewhere.

No action needed beyond keeping it this way.

---

## Module-boundary & pattern consistency notes (MEDIUM, effort M)

- **No single source of truth per domain.** `submissions` logic exists in `src/lib/submissions.ts`, `src/lib/db/repositories.ts`, `api/src/lib/submissions.ts`, and inline in routes. Same for compliance, graph, sync, embedding (Finding 4). A reader cannot answer "where does X live?" without grepping.
- **Inconsistent persistence pattern.** Some routes use `db/repositories.ts` (submissions, billing/webhook), some use feature `store.ts` files that are pure in-memory Maps (programs, billing/store), some inline `new Map()` in the route (exchange). Three patterns, no convention. (Root cause of Finding 3.)
- **Inconsistent "engine in root vs subdir."** Some engines are flat root files, some are subdirs, some are both. No rule.
- **Error handling:** request tracing is consistent (`with-request-context`/`withTracing` wrapper, per CLAUDE.md and confirmed by `lib/api/with-request-context.ts`), which is a genuine strength. But error *responses* and env-failure modes are not centralized (Finding 7) — missing env throws mid-request rather than at boot.

---

## Prioritized remediation plan

**Do now (cheap, high-ROI, zero behavior change):**
1. Delete `api/` (Finding 1) — removes ~63K LOC and the dual-maintenance tax. *(S–M)*
2. Delete fully-dead modules (Finding 5): `ideas.ts`, `exchange.ts`, `sync-engine.ts`, `sync/`, `infrastructure/{soc2,disaster-recovery,observability,sharding}.ts`, `ml/{social-graph,embedding-system}.ts`, `compliance/index.ts`, unused `config.ts` (or adopt it). ~12K+ LOC. *(S)*
3. Delete `api/v2/` + `versioning.ts` + `v2-transforms.ts` (Finding 2). *(S)*

**Do before launch (correctness / data integrity):**
4. Move Perk Programs and Exchange off in-memory Maps onto Postgres (Finding 3). Gate launch on "survives a cold start." *(L)*
5. Adopt one validated config module; fail fast on missing env (Finding 7). *(M)*
6. Typecheck tests (Finding 9). *(S)*

**Strategic (ongoing):**
7. Quarantine or delete the speculative scale infra (Finding 8). Cut to the spine.
8. Establish one-impl-per-domain + one persistence pattern conventions (boundary notes).

**Leave alone (already good):** `next.config.js` / CSP (Finding 10), TS strictness (Finding 9), request tracing.

---

## Classification summary

| Bucket | Examples |
|---|---|
| shipped & working | auth, campaigns, submissions (DB-backed), billing/webhook, request tracing, CSP/security headers, TS strictness |
| partial | billing (durable per memory, but `billing/store.ts` still has in-memory Map + "wire it up" TODO), verification (root+subdir both half-used) |
| broken (for prod durability) | Perk Programs (in-memory), Exchange (in-memory), any of the 19 in-memory routes that need to persist |
| dead-or-abandoned | **entire `api/` backend**, `api/v2/` + versioning, `ideas.ts`, `exchange.ts`, `sync-engine.ts` + `sync/`, `ml/{social-graph,embedding-system}`, `compliance/index.ts`, `config.ts` |
| speculative-for-0-users | event sourcing, CRDT sync, multi-tenant, sharding, soc2, disaster-recovery, observability, ML fraud pipeline, plugin-system, exchange/order-book, API versioning |
