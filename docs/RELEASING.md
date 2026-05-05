# Releasing the npm packages

The three workspace packages ship together in lockstep:

- `@socialperks/sdk`
- `@socialperks/cli`
- `@socialperks/mcp-server`

`scripts/publish-packages.mjs` is the one command that does the whole release. Don't run `npm publish` by hand — the script bumps versions, updates the cross-dependency, builds, smoke-tests, publishes in dependency order, tags, and pushes.

## First-time setup

You need to do this once before the first publish:

1. **Claim the npm scope.** Either as an org or as a personal scope:
   ```bash
   # Free org (recommended — supports collaborators):
   npm org create socialperks
   # Or as a user-scoped publish (fallback):
   npm config set scope socialperks
   ```
2. **Log in to npm:**
   ```bash
   npm login
   ```
3. **If you have 2FA enabled** (you should) — keep an authenticator app ready. The script accepts `--otp=NNNNNN` or you can pass it interactively when npm prompts.

## Day-to-day release

```bash
# Patch bump (0.1.0 → 0.1.1) — default
npm run release:packages

# Minor (0.1.0 → 0.2.0) — for new features
npm run release:packages:minor

# Major (0.1.0 → 1.0.0) — for breaking changes
npm run release:packages:major

# Dry run — does everything except npm publish + git push
npm run release:packages:dry

# Explicit version
node scripts/publish-packages.mjs --version=0.3.7

# Pre-release on the `next` dist-tag (won't move @latest)
node scripts/publish-packages.mjs --bump=minor --tag=next

# 2FA OTP passed inline (instead of interactive prompt)
node scripts/publish-packages.mjs --otp=123456

# Allow dirty working tree (only for emergencies)
node scripts/publish-packages.mjs --skip-clean

# Skip git commit/tag/push (publish to npm only)
node scripts/publish-packages.mjs --skip-git
```

## What the script actually does

```
1. Pre-flight
   ├─ git status clean (unless --skip-clean)
   ├─ npm whoami
   └─ npm view <pkg> for each package
2. Plan version (current → next based on --bump or --version)
3. Update package.json × 3
   └─ Cross-deps: cli + mcp-server depend on sdk@<next>
4. Confirm prompt (TTY only; auto-yes in CI)
5. Build
   ├─ rm -rf packages/*/dist
   ├─ tsc -p packages/sdk         → dist/
   ├─ tsc -p packages/cli         → dist/   (chmod +x dist/cli.js)
   └─ tsc -p packages/mcp-server  → dist/   (chmod +x dist/server.js)
6. Smoke tests
   ├─ SDK: instantiate + poster.url() returns expected URL
   ├─ CLI: spawn `node dist/cli.js help`, exit 0, contains USAGE
   └─ MCP: catalog has 6 tools, initialize → 2024-11-05
7. Publish
   ├─ @socialperks/sdk         (publishes first; deps need it on registry)
   ├─ wait 5s for propagation
   └─ @socialperks/cli + @socialperks/mcp-server (parallel)
8. Git
   ├─ commit "release: vX.Y.Z"
   ├─ tag vX.Y.Z + per-package tags (@socialperks/sdk@X.Y.Z, etc.)
   └─ push commits + tags
9. Print URLs to npmjs.com for each package
```

## After a successful release

The script ends with copy-pasteable verification:

```bash
npx @socialperks/cli@<version> init --email you@example.com
```

That call hits `https://socialperks.io/api/v1/dev/init`, gets back an API key, writes it to `.env.local`. If the deploy is current, it works end-to-end.

## If a publish fails partway through

The most common failure modes:

| Failure | What happened | Recovery |
|---------|--------------|----------|
| `npm whoami` fails | Not logged in | `npm login`, retry |
| 403 on publish | Scope not owned, or 2FA token expired | Verify scope ownership, re-auth, retry with `--otp` |
| `tsc` fails | Source error introduced since last build | Fix, re-run |
| Smoke test fails | Built dist doesn't behave as expected | Investigate before retrying — the script intentionally aborts here |
| SDK published but CLI failed | Network blip mid-parallel | Re-run with `--version=<same>` to retry just the failed ones; npm will reject duplicate publishes for the SDK and continue |

If you ever end up with a published version that's broken, use `npm deprecate`:

```bash
npm deprecate @socialperks/sdk@0.1.3 "broken release; use 0.1.4"
```

Don't `npm unpublish` unless you're inside the 72-hour window — it breaks anyone who already installed.

## Per-package tags

Every release creates four git tags:

- `v0.X.Y` — the combined release tag
- `@socialperks/sdk@0.X.Y`
- `@socialperks/cli@0.X.Y`
- `@socialperks/mcp-server@0.X.Y`

This means you can `git checkout @socialperks/sdk@0.2.0` to inspect a specific package's source at a specific version.
