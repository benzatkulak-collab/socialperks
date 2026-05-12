# 21 — CI/CD Hardening Plan

State of CI/CD and the concrete next steps to harden it.

## Current state — in place

| Capability | Status |
|------------|--------|
| Lint (`npm run lint`) on every push | Active |
| Typecheck (`tsc --noEmit`) on every push | Active |
| Test (`npm test`) on every push | Active |
| Build (`npm run build`) on every push | Active |
| Auto-deploy on main after green | Active |
| Concurrency group + cancel-in-progress | Active |
| Caching `.next/cache` between runs | Active |
| 15-minute timeout per job | Active |
| Hourly prod smoke-test workflow | Active |
| Workflow opens issue tagged `prod-smoke` on failure | Active |

## TODO — concrete hardening steps

### TODO-1 — Branch protection on `main`

**Goal**: prevent merging to `main` without CI green and 1 approving review.

**How** (GitHub UI):
1. Repo → Settings → Branches → Branch protection rules → Add rule.
2. Branch name pattern: `main`.
3. Enable:
   - **Require a pull request before merging** → 1 approving review.
   - **Require status checks to pass before merging** → select the CI workflow jobs (lint, typecheck, test, build).
   - **Require branches to be up to date before merging**.
   - **Require linear history** (recommended — keeps git log clean).
   - **Do not allow bypassing the above settings** (until truly needed for hotfixes).
4. Save changes.

**Verification**: open a PR that fails CI, attempt to merge → should be blocked.

### TODO-2 — Dependabot for vulnerability scanning

**Goal**: weekly automated PRs for dependency updates and immediate alerts for known CVEs.

**How**:
1. Create `.github/dependabot.yml`:
   ```yaml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
       open-pull-requests-limit: 5
       labels: ["dependencies"]
       groups:
         minor-and-patch:
           update-types: ["minor", "patch"]
     - package-ecosystem: "npm"
       directory: "/api"
       schedule:
         interval: "weekly"
     - package-ecosystem: "github-actions"
       directory: "/"
       schedule:
         interval: "monthly"
   ```
2. Repo → Settings → Code security and analysis → enable:
   - **Dependabot alerts**
   - **Dependabot security updates**
   - **Dependabot version updates**

**Cost**: free.

**Verification**: within a week, the first Dependabot PRs should appear.

### TODO-3 — Secrets scanning (gitleaks)

**Goal**: block commits or PRs that introduce secrets (API keys, tokens, DB URLs).

**How**:
1. Add a new workflow `.github/workflows/secrets-scan.yml`:
   ```yaml
   name: Secrets Scan
   on: [push, pull_request]
   jobs:
     gitleaks:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
           with:
             fetch-depth: 0
         - uses: gitleaks/gitleaks-action@v2
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```
2. Add to branch protection required checks.
3. Optionally add `.gitleaks.toml` with custom rules / allowlist.

**Cost**: free for public; free up to a limit for private.

**Verification**: open a PR that introduces a fake-looking secret string; CI should fail.

### TODO-4 — CodeQL scanning

**Goal**: static security analysis on every push.

**How**:
1. Repo → Settings → Code security → Set up CodeQL → default config.
2. Reviews alerts in the Security tab.

**Cost**: free for public; included with GitHub Advanced Security for private.

### TODO-5 — Required signed commits

**Goal**: prevent commit-author spoofing.

**How** (after team has GPG/SSH signing set up):
1. Branch protection rule → **Require signed commits**.

**Cost**: free. Adds friction — defer until team grows.

## Recommended workflow improvements (non-blocking)

### Faster CI via job parallelism
Lint, typecheck, and test can run in parallel — they don't depend on each other. Build needs them green. Restructure jobs:

```
lint ─┐
type ─┼─> build ─> deploy
test ─┘
```

Expected savings: 1–2 minutes per push.

### Coverage report comment on PRs
Wire `vitest --coverage` → coverage-report action that comments on the PR with diff coverage. Helps reviewers spot untested changes.

### Bundle-size delta on PRs
Wire `@next/bundle-analyzer` + a comment action to flag PRs that grow bundle by > 5%.

## Out of scope at this stage

- **Multi-environment pipelines** (staging → prod gates): single deploy target for now.
- **Canary deploys**: needs traffic shaping; not justified pre-revenue.
- **Mutation testing**: useful but high-effort. Revisit at MRR ≥ $2k.

## Implementation order

1. **TODO-1** (branch protection) — 5 minutes, biggest safety win.
2. **TODO-2** (Dependabot) — 15 minutes.
3. **TODO-3** (gitleaks) — 30 minutes including testing.
4. **TODO-4** (CodeQL) — 10 minutes.
5. **TODO-5** (signed commits) — when there are ≥ 2 contributors.

Total to hit a hardened baseline: ~1 hour.

## Re-check schedule

- Branch protection: confirm at each release that the rules still apply.
- Dependabot PRs: act on critical/high CVEs within 7 days.
- Gitleaks: review false-positive rate monthly; tune allowlist.

See [20-regression-testing-suite-readme.md](./20-regression-testing-suite-readme.md) for the test-suite side, and [22-disaster-recovery.md](./22-disaster-recovery.md) for what CI does and doesn't protect against.
