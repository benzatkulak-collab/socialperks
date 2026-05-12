# 22 — Disaster Recovery

DR plan covering backups, failure modes, recovery procedures, and RTO/RPO targets.

## Backups inventory

| Asset | Provider | Backup method | Retention |
|-------|----------|---------------|-----------|
| Database (Postgres) | Neon | Point-in-time recovery (PITR) | 7 days (free tier) |
| Application code | GitHub | Git history | Forever |
| Container images | Render | Last N deploys retained | ~30 days |
| Stripe data (customers, subscriptions, payments) | Stripe | Lives in Stripe; replayable via webhook events | Forever (Stripe-side) |
| Uploaded images | R2 / S3 | Provider-side redundancy | Forever (object lifecycle) |
| Email logs | Resend | Provider-side | 30 days (free tier) |
| Audit log | Postgres (after M1); in-memory today | PITR after M1; lost on restart today | 7 days after M1 |

## Failure modes and recovery

### DB corruption or accidental data deletion

**Symptoms**: queries return wrong data, tables missing rows, mass-delete via app bug.

**Recovery**:
1. Open Neon console → Branches → Restore from point in time.
2. Pick the timestamp before the corruption (e.g., 5 minutes before the bad deploy).
3. Promote the restored branch to primary, OR copy specific rows out and back in.
4. Notify affected customers within 24h.

**RTO**: ~30 minutes (manual).
**RPO**: ~PITR resolution — Neon free tier supports per-second restore within retention window.

### Render outage (single-region)

**Symptoms**: app returns 5xx, smoke-test workflow opens issue.

**Recovery**:
1. Check [status.render.com](https://status.render.com) — confirm provider-side.
2. If Render is hard-down: trigger a fresh deploy from GitHub once they recover.
3. If our service is unhealthy but Render is fine: investigate via Render logs; rollback to previous deploy if needed.

**RTO**: depends on Render restoration. We can't shortcut a Render-wide outage at the free tier.
**Future mitigation**: M6a multi-region deploy provides regional failover.

### Stripe outage

**Symptoms**: checkout fails; webhook deliveries delayed.

**Recovery**:
1. Display a user-facing message: "Payments temporarily unavailable; we'll email you when we're back."
2. Stripe automatically retries webhooks for up to 3 days. Our webhook handler is idempotent (Idempotency-Key middleware), so duplicate delivery is safe.
3. After Stripe recovers, replay the missed events via Stripe Dashboard if necessary.

**RTO**: depends on Stripe.
**RPO**: 0 — Stripe retains all customer/payment data; no local loss.

### Neon outage

**Symptoms**: DB connections fail; `/api/v1/health` returns 503.

**Recovery**:
1. Confirm via Neon status page.
2. Once recovered, app reconnects automatically (Prisma client retries).
3. After M1, in-flight requests during outage may have failed; clients should retry idempotent ones.

**RTO**: depends on Neon (typically minutes for free tier).
**RPO**: 0 if Neon recovers cleanly; up to PITR resolution if escalates to data restore.

### Domain expiration / DNS misconfiguration

**Symptoms**: site unreachable; SSL warnings.

**Recovery**:
1. Cloudflare has **auto-renew enabled** for `socialperks.app`. Verify annually.
2. If DNS misconfig: revert in Cloudflare; propagation typically < 5 minutes given Cloudflare's TTL.

**RTO**: 5–15 minutes for DNS; potentially hours for expired domain.
**Action**: calendar reminder 60 days before renewal to verify payment method.

### GitHub outage

**Symptoms**: can't deploy; CI doesn't run.

**Recovery**:
1. Wait. GitHub outages are typically < 4 hours.
2. Existing prod deployment continues serving traffic.
3. If a critical hotfix is needed, deploy from local clone directly to Render via CLI.

**RTO**: 0 for existing prod; recovery depends on GitHub.

### Secret leak (env var exposed in commit, logs, etc.)

**Symptoms**: gitleaks alert, or external researcher report.

**Recovery**:
1. Rotate the leaked secret immediately at the provider (Stripe, OAuth providers, JWT signing key, webhook signing secret).
2. Update env vars in Render dashboard.
3. Force restart.
4. Audit logs for misuse during the exposure window.
5. If user data may have been accessed, follow disclosure process (notify users within 72 hours per GDPR-style timing).

**RTO**: 15 minutes to rotate; longer if audit reveals misuse.

## RTO / RPO summary

| Scenario | RTO | RPO |
|----------|-----|-----|
| DB corruption | ~30 min | seconds (Neon PITR) |
| Render outage | depends on Render | 0 (no local data loss after M1) |
| Stripe outage | depends on Stripe | 0 (Stripe-side retention) |
| Domain DNS | 5–15 min | n/a |
| Secret leak | 15 min rotation | data exposure depends on detection lag |
| Worst case (multiple simultaneous) | ~24 hours | ~24 hours (assumed pre-M1 in-memory loss) |

After M1 lands (Prisma migration), RPO for in-memory state becomes seconds instead of "since last deploy."

## Recommended improvements

### Now (free)
- Calendar reminder 60 days before domain renewal.
- Document the Neon restore procedure with screenshots (one engineer should walk it once before they need it).
- Add a `/api/v1/status` field showing "last restart" timestamp for debugging.

### Trigger: MRR ≥ $200
- Upgrade Neon to Launch tier — extends PITR retention from 7 days to 14 days.

### Trigger: MRR ≥ $500
- Add a Neon read replica for read-side failover.

### Trigger: MRR ≥ $2k
- Multi-region deploy (M6a). Regional Render/Vercel/CF outage no longer takes the site down.

### Trigger: first enterprise deal
- Documented and rehearsed DR drill quarterly.
- DR runbook signed off by customer's security review.

## DR drill schedule

| Frequency | Drill |
|-----------|-------|
| Quarterly (manual) | Restore Neon to a branch, verify schema is current |
| Annually | Full secret-rotation drill (rotate Stripe + JWT + OAuth secrets in dev environment) |
| At each major release | Smoke test the failover paths in CI |

## Out of scope

- Geographic disaster (data-center fire/flood) — relying on provider SLA for now.
- Provider acquisition / shutdown — Render or Neon going out of business. Mitigation: portability — Prisma works against any Postgres, Render builds standard Docker containers.

See [15-reliability-findings.md](./15-reliability-findings.md) for the day-to-day reliability defenses and [17-scalability-findings.md](./17-scalability-findings.md) for tier-limit triggers.
