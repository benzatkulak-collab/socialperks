# Lighthouse audit — homepage baseline

Captured against `npm run dev` localhost:3000 with Lighthouse 13.2.0
(headless Chrome, mobile profile, default throttling).

## Scores

| Category | Score |
|---|---|
| Performance | 78 |
| Accessibility | 81 |
| Best Practices | 96 |
| SEO | 91 |

Healthy baseline. Best Practices and SEO are publish-ready. Performance
and Accessibility have specific concrete fixes — listed below.

## Accessibility (81 → 100 path)

**Quick wins (each 5-10 min):**

1. **`aria-hidden-focus` on mobile-menu drawer** — `src/components/shared/nav.tsx`
   - The closed mobile menu is `aria-hidden="true"` but its `<a>`/`<Link>`
     children remain in the tab order. Add `inert` attribute when closed
     (modern, single-line change) — does both `aria-hidden` AND removes
     focus from the subtree.
   - Pattern: `<div ... inert={!mobileOpen} aria-hidden={!mobileOpen}>`

2. **`landmark-one-main`** — most pages have `<main id="main-content">`
   but the demo / wallet / a few others use plain `<main>` without an
   id, or wrap in a `<div>` instead. Audit all top-level page.tsx files
   and ensure each has exactly one `<main id="main-content">` as the
   primary landmark.

3. **`color-contrast` on small inline spans** — failures show three
   `<span class="flex items-center gap-2">` snippets. Likely the trust
   strip on the landing ("FTC-compliant disclosures auto-injected") —
   the `text-brand-muted` (`#94A3B8`) on `bg-brand-surface/30` doesn't
   pass AA at small font sizes. Bump those instances to `text-brand-dim`
   (`#CBD5E1`) which clears AA at 12px.

4. **`label-content-name-mismatch`** — buttons where visible text
   differs from `aria-label`. Most likely the icon-only buttons on the
   business dashboard. Either remove the `aria-label` (text alone is
   sufficient) or make the aria-label start with the visible text.

5. **`link-in-text-block`** — paragraph-embedded links rely only on
   color to distinguish from text. Add `underline underline-offset-2`
   to all in-paragraph `<Link>` / `<a>` instances. Tailwind utility,
   one-line per element. Find them via `grep -r "text-brand-cyan" src`.

**Deeper-pass:**

6. **`definition-list` / `dlitem`** — somewhere we wrap `<script>` or
   non-`<dt>`/`<dd>` content inside a `<dl>`. The pricing-section
   feature comparison is a likely culprit. Either fix the structure
   or use `<ul>` with semantic list-of-features styling.

## Performance (78 → 90+ path)

**Quick wins:**

1. **Console errors during page load** — five 404s in the audit. Likely
   missing icon variants or a service-worker asset. Open DevTools
   Network tab on `/`, filter to 404s, fix or `next/image`-replace.

2. **First Contentful Paint** — heavy hero/Above-the-fold CSS. Audit
   `globals.css` for unused selectors via PostCSS purge (Tailwind
   already does this, but custom CSS variables block render). Move the
   font-loading to `display=swap` in `next/font` config.

3. **Largest Contentful Paint** — likely the hero image or the OG-style
   visual. Add `priority` prop to the LCP image, ensure it's pre-loaded
   in `<head>`.

4. **Speed Index** — improves automatically once FCP/LCP are fixed.

**Deeper-pass:**

5. **`unused-javascript`** — Next.js code-splitting is on, but check
   the Vercel Analytics + tracking-pixel imports in root layout. They
   may be loading eagerly when they should be lazy.

## Best Practices (96 → 100)

The 4 lost points are likely:
- One library shipping with deprecated console.warn output
- A console.warn from `next/font` about variable fonts

Both ignorable for launch.

## SEO (91 → 100)

The 9 lost points are typically `crawlable-anchors` (some link with
empty `href` or pure JS handler) and `robots-txt-status` checks that
are flaky in dev. Re-run against production once SSO Deployment
Protection is disabled.

---

## How to re-run

```bash
npm run dev &
sleep 4
mkdir -p /tmp/sp-lighthouse && cd /tmp/sp-lighthouse
npx --yes lighthouse@latest http://localhost:3000 \
  --output=json --output-path=./home.json --quiet \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```

Or against production once SSO is off:

```bash
npx --yes lighthouse@latest https://socialperks.io \
  --view --preset=desktop
```

## Priority order for fixes

If we're shipping in the next week, do these in order:
1. `aria-hidden-focus` (1 line in nav.tsx) — visible to screen-reader users today
2. Console 404s (find + fix) — pollute dev experience and look unpolished
3. `color-contrast` (find + bump tone) — visible to users with low-vision
4. `link-in-text-block` (utility class pass) — visible to users with color-blindness
5. `landmark-one-main` (audit pages) — semantic correctness
6. The rest are polish.
