---
name: forms
description: >-
  Audit every user-facing form for client + server validation, visible error and
  success states, spam protection, and real persistence through a /api/v1 route.
  Use whenever the user mentions forms, waitlist, signup, contact form, form
  validation, "does the form actually save", spam, or submit handlers.
argument-hint: "[component]"
allowed-tools: Read, Grep, Glob
model: sonnet
---

# Forms audit

A form that looks fine but silently drops submissions is worse than no form — it
burns the exact leads you paid to acquire. So the real test is end-to-end: does
the input reach the database, and does the user KNOW whether it did.

## Scope
Find the forms first: `grep -rln '<form\|onSubmit\|useState' src/components` and
look for the known ones — waitlist-form, auth-form, submit-form, contact.
Narrow to one with `$ARGUMENTS`.

## Per-form checklist (all five required)
1. **Client validation** — required fields, email/format checks before submit;
   ideally reusing `src/lib/security/validate.ts` / `src/lib/shared/validation.ts`.
2. **Server validation** — the receiving `/api/v1/*` route re-validates (client
   checks are UX, not security). Trace the fetch target to its route handler.
3. **Visible error state** — validation + network failures render an inline,
   readable message; the button doesn't just spin forever.
4. **Visible success state** — confirmation UI or redirect on 2xx, not a silent
   no-op.
5. **Real persistence** — the submit hits an actual `/api/v1` route that writes
   to the DB (not a `console.log`, a `#`-href, or a TODO). Confirm the route
   exists and persists.
6. **Spam protection** — honeypot, rate-limit (`src/lib/security/rate-limiter.ts`),
   and/or CSRF (`src/lib/security/csrf.ts`) on the endpoint.

## Output
Table: Form | Client valid | Server valid | Error UI | Success UI | Persists via
route | Spam guard. Mark each pass/fail; for every fail give the file:line and
the concrete fix. Call out the worst case: a form that appears to submit but
persists nothing.
