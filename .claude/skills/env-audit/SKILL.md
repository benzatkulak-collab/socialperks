---
name: env-audit
description: >-
  Cross-check .env.example against real code usage: every required var is read
  somewhere, nothing secret hides behind NEXT_PUBLIC_, and no secrets are
  hardcoded in src/. Use whenever the user mentions env vars, .env, secrets,
  config, API keys, "did I set everything", missing environment variables, or
  deploy configuration.
argument-hint: ""
allowed-tools: Read, Grep, Glob
model: sonnet
---

# Environment / secrets audit

Why this gate matters: a missing `[BLOCKING]` var 500s auth or billing in prod,
and a real secret behind `NEXT_PUBLIC_` ships straight to the browser bundle
where anyone can read it. Both are launch-blockers that no test catches.

## Source of truth
`.env.example` tags every var with a severity: `[BLOCKING]` (runtime throws /
critical feature 500s), `[REQUIRED]` (needed before the first paying customer),
`[OPTIONAL]` (safe default exists). Read it first and build the expected set.

## Checks
1. **Every required var is read.** For each `[BLOCKING]` / `[REQUIRED]` var,
   `grep -rn 'process.env.<NAME>' src` and confirm it's actually consumed. A
   required var that nothing reads is either dead or mis-named — flag it.
2. **No secret behind NEXT_PUBLIC_.** `grep -rn 'NEXT_PUBLIC_' src .env.example`.
   The ONLY values legitimately public: Meta/GA pixel ids, the `phc_` PostHog
   key, the public site URL, and the publishable (client) Sentry DSN. Anything
   that looks like `sk_`, `whsec_`, `AUTH_SECRET`, `CSRF_SECRET`, a DB URL, or a
   service key behind `NEXT_PUBLIC_` is a critical leak.
3. **No hardcoded secrets in src/.** Grep for inline `sk_live`, `sk_test`,
   `whsec_`, `postgres://`/`postgresql://` with credentials, private keys, and
   long hex/base64 literals assigned to secret-looking names.
4. **Per-environment gaps.** Note vars that must differ dev vs. prod (e.g.
   `sk_test_` vs `sk_live_`, `DATABASE_URL`) and whether guidance exists.

## Output
Three sections. (1) Missing/unused required vars: Var | Severity | Read in code?.
(2) NEXT_PUBLIC_ leakage: Var | Public-OK? | Verdict. (3) Hardcoded secrets:
file:line + what leaked. End with a go/no-go on the `[BLOCKING]` set. Also
enforced in CI via `.github/workflows/launch-gate.yml`.
