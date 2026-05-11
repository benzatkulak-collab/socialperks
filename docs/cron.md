# Cron / Scheduled Tasks

Render's free tier has no native cron, so Social Perks uses **GitHub Actions
as the scheduler** and an authenticated HTTP endpoint as the runner. GitHub
Actions hits `GET /api/v1/cron?task=<name>&key=<secret>` on a schedule, and
that route dispatches to a handler in `src/lib/cron/tasks.ts`.

This is free, transparent (every run shows up in the Actions log), and works
on any host that can serve HTTP — no extra infrastructure required.

## Architecture

```
GitHub Actions (cron.yml)
        │
        │  curl -fsSL "https://socialperks.onrender.com/api/v1/cron?task=X&key=$CRON_SECRET"
        ▼
/api/v1/cron (route.ts)
        │  validates ?key against process.env.CRON_SECRET
        │  dispatches by ?task name
        ▼
src/lib/cron/tasks.ts
        │  pure async functions, return { processed, succeeded, failed, errors }
        │  errors are captured per-item (one bad row doesn't crash the run)
        ▼
recordLastRun(...)  ──►  /api/v1/cron/status  (public read-only)
```

## Registered tasks

| Task               | Cadence              | What it does                                                |
| ------------------ | -------------------- | ----------------------------------------------------------- |
| `newsletter-drip`  | every 15 min         | Sends the next due course-drip lesson to subscribers        |
| `trial-expiring`   | hourly               | Reminds businesses whose trial ends within 3 days           |
| `cleanup-expired`  | hourly               | Expires perks past `expiresAt`, transitions stale campaigns |
| `lead-status-sync` | daily 03:00 UTC      | (Stubbed) refresh stats on existing leads                   |
| `weekly-digest`    | Mon 14:00 UTC weekly | Sends the weekly stats email to active-campaign businesses  |

Cron expressions live in `.github/workflows/cron.yml`. The 15-min runner is
cheap because tasks like `newsletter-drip` enforce their own 24h delay in
`getDueLessons` — frequent polling just means lessons go out within 15 min of
becoming due.

## One-time setup

1. **Generate a secret**

   ```bash
   openssl rand -base64 32
   ```

2. **Add it to Render**

   Render dashboard → your service → Environment → add
   `CRON_SECRET=<value>`. Save and redeploy.

3. **Add it to GitHub repo secrets**

   GitHub repo → Settings → Secrets and variables → Actions →
   "New repository secret":

   - Name: `CRON_SECRET`
   - Value: (paste the same value)

4. **(Optional) Override the base URL**

   If your deployment is somewhere other than
   `https://socialperks.onrender.com`, add a second secret
   `CRON_BASE_URL=https://my-app.example.com`. The workflow reads this with a
   fallback to the Render URL.

That's it. The workflow runs automatically on its schedules. You can also
trigger it manually from Actions → "Cron jobs" → "Run workflow" (and
optionally type a task name to run just one).

## Verifying it works

```bash
# Public — no auth needed
curl https://socialperks.onrender.com/api/v1/cron/status | jq
```

Each task shows a `lastRun` field with `ranAt`, `success`, `processed`,
`succeeded`, `failed`. `null` means it hasn't run since the last server
restart (the store is in-memory).

For a deeper check, look at the GitHub Actions "Cron jobs" workflow runs —
every step prints the curl response.

## Testing locally

```bash
# Set a dev secret
export CRON_SECRET=test

# Start the dev server
npm run dev

# Run a task
curl "http://localhost:3000/api/v1/cron?task=cleanup-expired&key=test" | jq

# Check status
curl http://localhost:3000/api/v1/cron/status | jq
```

If `CRON_SECRET` is unset the route returns `503 CRON_NOT_CONFIGURED` rather
than silently accepting requests.

## Adding a new task

1. Add an async handler to `src/lib/cron/tasks.ts`:

   ```ts
   export async function runMyTask(): Promise<TaskResult> {
     const result = emptyResult();
     try {
       // ... your logic ...
       result.processed = 5;
       result.succeeded = 5;
     } catch (e) {
       recordError(result, "myTask", e);
     }
     return result;
   }
   ```

2. Register it in the `TASKS` map (and the `TaskName` union) at the bottom of
   the same file:

   ```ts
   export type TaskName = ... | "my-task";

   export const TASKS: Record<TaskName, () => Promise<TaskResult>> = {
     ...
     "my-task": () => runMyTask(),
   };
   ```

3. Add a job (or extend an existing schedule) in `.github/workflows/cron.yml`
   that curls `?task=my-task&key=…` on the cadence you need.

4. Deploy. The new task is now visible at `/api/v1/cron/status` and runnable
   from the workflow_dispatch "Run workflow" button.

## Failure semantics

- A task **never throws**. Per-item errors are captured into the
  `result.errors[]` array. The HTTP response is still `200` so GitHub
  Actions doesn't retry a non-recoverable failure.
- If a task throws unexpectedly anyway, the route catches it and returns
  `200` with `success: false`.
- The only way to get a non-2xx is auth failure (`401`), unknown task
  (`400`), or missing config (`503`).
- The workflow uses `curl -f`, so non-2xx fails the step — you'll see a red
  X in Actions and get a notification.

## Why not Vercel Cron / a dedicated scheduler?

Vercel Cron would be simpler but ties us to Vercel hosting. The current
setup works on any host (Render, Fly, Railway, self-hosted) — the only
requirement is a public HTTPS endpoint. If we move to a paid host with
native cron later, the route stays exactly the same; we just delete the
GitHub Actions workflow.
