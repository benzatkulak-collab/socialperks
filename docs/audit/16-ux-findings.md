# 16 — UX Findings

State of UX after the audit pass.

## Summary

- 35 stale signup CTAs corrected to point at the live `/auth?mode=signup` route.
- Domain references unified to `socialperks.app` (was inconsistent with `socialperks.io`).
- 219 references updated across 76 files in the domain cleanup.
- Onboarding wizard verified end-to-end.
- Demo mode reviewed and polished — accounts listed in `CLAUDE.md` work cleanly.
- Remaining: full keyboard navigation audit per page.

## Fixed

### UX-001 — 35 stale signup CTAs (MEDIUM)
- **Symptom**: Multiple landing-page and footer CTAs linked to an older signup route (`/signup` or `/get-started`) that no longer existed. Result: 404 or fallback redirect, leaking conversion.
- **Fix**: All 35 corrected to `/auth?mode=signup`. Audit grep `href="/signup"` now returns zero.
- **Verification**: Manual click-through on landing + footer + pricing pages.

### UX-002 — Domain reference inconsistency (MEDIUM)
- **Symptom**: `socialperks.io` and `socialperks.app` both appeared in code (email templates, OG tags, hardcoded URLs, footer, sitemap). `.io` was the legacy domain. Brand and SEO penalty.
- **Fix**: 219 references updated across 76 files. New canonical: `socialperks.app`.
- **Verification**: `grep -rn "socialperks.io" src/ public/` returns zero.

## Working well (audit confirmed)

- **Onboarding wizard**: New-user flow from landing → signup → first-campaign creation works without dead ends. The wizard adapts to audience (business / influencer / enterprise).
- **Demo mode**: All demo accounts in `CLAUDE.md` log in cleanly with PIN `1234`. Demo data seeds reliably.
- **Empty states**: Dashboard, campaign list, submission list all have informative empty states with primary actions.
- **Responsive layout**: Mobile breakpoints reviewed on landing + dashboard. No catastrophic overflow.
- **i18n surface**: EN/ES/PT all render without missing keys on landing.

## Remaining

### UX-003 — Full keyboard-navigation audit (LOW)
- **Status**: Not yet run page-by-page. Spot checks (Tab through landing, dashboard nav) show focus rings present and order roughly sensible, but corners haven't been validated.
- **Specific gaps to check**:
  - Modal/dialog focus traps — are they trapping correctly?
  - Tab order on campaign wizard (multi-step form)
  - Tab order on dashboard left-rail nav
  - Skip-to-content link presence
  - `aria-live` regions on toast notifications
- **Effort**: M — one engineer + one day, ideally with a screen-reader pass.
- **Target**: Bundled with next UX sprint.

### Suggested follow-ups (not blockers)

- **Loading-state consistency**: Some pages show a skeleton, others show a spinner. Pick one pattern.
- **Error-state consistency**: API errors render inline in some places, as toasts in others. Pick the right pattern per context (inline for form errors, toast for global).
- **Color contrast audit**: Quick WCAG AA spot-checks pass for body text; verify amber-on-dark warning states meet 4.5:1.
- **Mobile dashboard density**: Tables compress with horizontal scroll on phones. Consider a card-mode for primary tables.

## Localization status

- **EN**: Complete on production surfaces.
- **ES**: Complete on landing; dashboard ~80% (estimated). Pluralization edge cases not fully audited.
- **PT**: Complete on landing; dashboard ~70% (estimated).
- **Action**: When MRR > $500 and we have non-EN paying users, schedule a full audit per language.

## Re-check schedule

- Signup CTAs: every release. Already covered by E2E smoke that clicks the primary CTA.
- Domain refs: at release. `grep` should stay green.
- Keyboard nav: at next dedicated UX sprint or every 90 days.

See [23-production-readiness-score.md](./23-production-readiness-score.md) for the UX domain in the scorecard.
