---
name: loading-ux
description: >-
  Audit async surfaces for proper loading UX — skeletons via loading.tsx /
  Suspense fallbacks, optimistic UI where it makes sense, no layout jump when
  data resolves, and no blank/empty flash before data arrives. Invoke when the
  user mentions loading states, skeletons, spinners, layout shift, jank,
  "flashes blank", slow-feeling pages, or Suspense.
argument-hint: "[route]"
allowed-tools: Read, Glob, Grep
model: haiku
---

# Loading UX audit

A page that flashes blank, pops a spinner, then reflows when data lands feels
broken even when it's fast. Perceived performance is a real conversion lever:
reserve the space, show a skeleton, and never let content jump. This audit finds
the async surfaces that skip that.

## Where to look
- **Route-level**: search `src/app` for `loading.tsx` files — every route segment
  with an async server component or a slow fetch should have one. App Router
  auto-wraps the segment in `<Suspense>` when `loading.tsx` exists.
- **Component-level**: grep `src/components` for `Suspense`, `fallback`,
  `isLoading`, `isPending`, `useState(...loading...)`, and the data hooks in
  `src/lib/hooks` (`use-api.ts`, `use-campaigns.ts`, `use-store.ts`). Each async
  fetch needs a fallback UI.

## What to flag
1. **Missing skeletons**: an async route/panel with no `loading.tsx` and no
   Suspense fallback — it renders blank until data lands.
2. **Layout jump (CLS)**: the loading state has different dimensions than the
   resolved state (a spinner in the center, then a tall list). The skeleton must
   reserve the same height/shape.
3. **Empty flash**: data starts `undefined`/`[]` and renders the empty branch for
   a frame before the fetch resolves — gate on an explicit loading flag, not on
   array length.
4. **Missing optimistic UI**: mutations that clearly should feel instant
   (submitting an action, approving a submission, enrolling a member) that wait
   for a round-trip with no optimistic update or pending state on the button.

## Design system reference
Skeletons should use the dark surface tokens in `src/app/globals.css` (subtle
shimmer on `#0C0F1A` surfaces), matching the card shapes they stand in for.

## Output
Table: Route/Component | Async source | Gap (missing skeleton / CLS / empty
flash / no optimistic UI) | Fix (e.g. "add `loading.tsx` at
src/app/<seg>/loading.tsx" or "reserve height in fallback"). If a route is fully
covered, say so. $ARGUMENTS narrows to one route or segment.
