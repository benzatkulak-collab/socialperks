# Components Audit

Generated: 2026-05-11
Scope: `src/components/**`
Components reviewed: 120 files (auth, business, courses, dashboard, enterprise, influencer, landing, onboarding, shared, ui, widget)
Issues fixed: 9
Issues documented (deferred): 8

## Summary

The component layer is in good shape. The 14-engine SaaS has a strong design-system foundation (`ui/modal.tsx`, `ui/confirm-dialog.tsx`, `ui/field.tsx`, etc.) and components consistently use those primitives. SSR concerns are handled with `typeof window !== "undefined"` guards. Every `addEventListener` call I found has a matching `removeEventListener` in a cleanup function. There are no `window.confirm` / `window.alert` usages in components (good — `ui/confirm-dialog.tsx` is used). No conditional hooks, no `useState(localStorage.getItem(...))` hydration traps, no missing `key` props uncovered, no `eslint-disable react-hooks` suppressions.

The real findings are minor a11y/UX papercuts.

## Issues fixed (this audit)

### `src/components/auth/auth-form.tsx`
**MEDIUM** — Eight nav-style `<button>` elements lacked `type="button"`. Currently safe because the file doesn't use `<form>`, but defensive default that prevents future submit-context regressions if the auth screens are ever wrapped in a form.
- Lines 235, 269, 301, 358, 370, 383, 397, 413 — added `type="button"`.

### `src/components/business/launch-modal.tsx`
**LOW** — Validation error region was `aria-live="assertive"`, which interrupts screen-reader focus. Changed to `aria-live="polite"` consistent with the rest of the codebase (`auth-form.tsx`, `course-signup-form.tsx`).

## Per-component findings (highlights)

### `src/components/auth/auth-form.tsx`
- Purpose: Multi-screen login/signup/forgot-password with audience selection.
- Issues:
  - MEDIUM (FIXED): Buttons missing `type="button"` (8 instances).
  - LOW (deferred): No `<form>` element, so pressing Enter in fields doesn't submit. Consider wrapping field groups in `<form onSubmit={handleLogin}>` for keyboard UX.
  - INFO: Uses `<Field>` design-system primitive — labels are properly associated.

### `src/components/auth/signup-trust-bar.tsx`, `social-proof-block.tsx`
- Static presentational; no client-side state. Could drop `"use client"` if any (none present).

### `src/components/business/launch-modal.tsx`
- Purpose: Customize-and-launch campaign modal.
- Issues:
  - LOW (FIXED): `aria-live="assertive"` → `"polite"`.
  - INFO: All form inputs properly labeled with `htmlFor` + `useId`. Escape handler, body scroll-lock, cleanup all correct.

### `src/components/business/qr-generator.tsx`
- Purpose: Generate QR codes + PNG/SVG download.
- Issues:
  - LOW (deferred): Uses `document.querySelector("[data-qr-svg]")` to serialize SVG for PNG export. Legitimate pattern (need DOM access for canvas rasterization) but a `useRef` on the SVG would be more idiomatic React.

### `src/components/business/referral-panel.tsx`
- LOW (deferred): `document.querySelector("#referral-link-input")` in the clipboard fallback. Same comment — could use a ref. Also uses deprecated `document.execCommand("copy")` as fallback, which is acceptable since modern browsers prefer the primary `navigator.clipboard` path.

### `src/components/shared/exit-intent.tsx`
- Purpose: Exit-intent newsletter capture popup.
- Issues:
  - LOW (deferred): Email input lacks an associated `<label>` (uses placeholder only). Trust-level issue — most users tolerate it but it fails strict a11y audits.
  - INFO: SessionStorage gating, mobile-vs-desktop trigger paths, focus management on Escape — all correct. Conditional `addEventListener` paths (mobile = scroll, desktop = mouseout) are cleaned up properly in unmount.

### `src/components/shared/newsletter-form.tsx`
- Clean. Proper `<label htmlFor>`, `type="email"`, `autoComplete="email"`, `noValidate` with custom regex, ARIA-error, idempotent dedup messaging.

### `src/components/shared/social-proof-popup.tsx`
- Clean. Timers tracked in `timersRef`, cleanup clears all on unmount. Random-without-repeat pick is good.

### `src/components/shared/sticky-cta.tsx`
- Clean. Scroll listener with cleanup, session-storage dismiss.

### `src/components/shared/nav.tsx`
- Three event listeners (scroll, resize, hashchange) all cleaned up.

### `src/components/shared/notification-center.tsx`
- Click-outside + Escape handlers cleaned up.

### `src/components/shared/search-bar.tsx`, `language-selector.tsx`
- Both have proper click-outside cleanup.

### `src/components/courses/course-signup-form.tsx`
- Clean. Proper `sr-only` label, `aria-describedby` for errors, `type="submit"` on button.

### `src/components/ui/modal.tsx`
- Excellent. Focus trap, focus restore on close, body scroll-lock, Escape handler, proper `role="dialog"` + `aria-modal` + `aria-label`. Reference implementation.

### `src/components/ui/confirm-dialog.tsx`, `field.tsx`, `button.tsx`, `card.tsx`, `badge.tsx`, `tabs.tsx`, `pagination.tsx`, `toast.tsx`, `chart.tsx`
- All clean. Tabs uses resize listener with cleanup.

### `src/components/ui/responsive-helpers.tsx`
- INFO: `useIsMobile()` returns `false` on first SSR render then `true` on hydration if mobile. Standard React pattern; only causes hydration mismatch if used in initial render path of server components — these are all `"use client"` consumers so it's fine.

### `src/components/business/portal.tsx`, `enterprise/portal.tsx`, `influencer/portal.tsx`
- Large portal shells; no anti-patterns detected in spot-checks. All event listeners traced have cleanups.

### `src/components/onboarding/wizard.tsx`
- Multiple `typeof window !== "undefined"` guards. Clean.

### `src/components/widget/perk-widget.tsx`
- Embeddable; correctly handles iframe context.

### `src/components/error-boundary.tsx`, `ui/section-error-boundary.tsx`
- Class-based error boundaries. Correctly implemented.

## Deferred items (LOW severity)

These are documented for future passes but not fixed in this audit:

1. **`exit-intent.tsx`** — email input missing `<label>` (uses placeholder).
2. **`qr-generator.tsx`** — `document.querySelector` for SVG export; prefer `useRef`.
3. **`referral-panel.tsx`** — `document.querySelector` for clipboard fallback; prefer `useRef`.
4. **`auth-form.tsx`** — wrap field groups in `<form>` so Enter submits.
5. **`launch-modal.tsx`** — perk-type toggle buttons are visually selected but rely on color (no aria-pressed). Could add `aria-pressed={perkType === o.value}`.
6. **`responsive-helpers.tsx`** — `useIsMobile()` initial-false on SSR can produce one-frame layout flash on mobile.
7. **`shared/nav.tsx`** — uses `window.location.pathname` in render path with `typeof window` guard but no state-mirror, which can cause a one-frame hydration discrepancy on links that depend on path.
8. **General** — Multiple icon-only buttons across components use `aria-label` correctly; no missing-label violations detected in spot-checks.

## Verification
- TypeScript: `npx tsc --noEmit` — zero errors in `src/components` (pre-existing error in `src/app/quiz/best-platform` page is unrelated and out of scope).
- All `addEventListener` calls inspected have matching `removeEventListener` cleanups.
- No `window.confirm` / `window.alert` / `window.prompt` usage.
- No conditional hooks.
- No hydration-unsafe `useState(localStorage|window|document...)` initializers.
