# apis.guru submission

## What this is

[apis.guru](https://apis.guru) is the canonical public directory of OpenAPI
specs — used by Microsoft Kiota, Speakeasy, Pipedream, ReadMe, Apideck,
and many AI agents that want a curated index of public APIs.

Submissions are made via PR to
[`APIs-guru/openapi-directory`](https://github.com/APIs-guru/openapi-directory).

## Prerequisites

- [ ] Site deployed publicly (deployment protection OFF)
- [ ] `https://socialperks.io/api/v1/openapi` returns 200 with valid OpenAPI 3.1
- [ ] OpenAPI spec validates (use https://editor.swagger.io/ to confirm)

## How to submit

```bash
# 1. Fork the directory
gh repo fork APIs-guru/openapi-directory --clone --remote

# 2. Add Social Perks under APIs/socialperks.io/
cd openapi-directory
mkdir -p APIs/socialperks.io/1.0.0
curl https://socialperks.io/api/v1/openapi > APIs/socialperks.io/1.0.0/openapi.json

# 3. Commit + PR
git checkout -b add-social-perks
git add APIs/socialperks.io/
git commit -m "Add Social Perks API"
git push origin add-social-perks
gh pr create --title "Add Social Perks API" --body "$(cat <<'EOF'
Adds the Social Perks API — a marketing platform where small businesses
exchange perks (discounts, free items) for marketing actions across 25
social platforms (125 actions total).

The OpenAPI 3.1 spec at https://socialperks.io/api/v1/openapi covers:

- Reference data (pricing, actions, benchmarks) — public, no auth required
- Campaign management — auth via x-api-key or JWT
- Submissions and AI generation
- Marketplace exchange endpoints

Site: https://socialperks.io
Spec: https://socialperks.io/api/v1/openapi
Docs: https://socialperks.io/AGENTS.md

Validates against the OpenAPI 3.1 schema. Public endpoints are CDN-cached.
EOF
)"
```

## Why apis.guru matters

- **Microsoft Kiota** uses apis.guru as its default directory for
  client-code generation. Once Social Perks is in apis.guru, anyone using
  Kiota can `kiota search socialperks` and instantly generate a typed client.
- **Speakeasy, Pipedream, ReadMe** all sync from apis.guru.
- **AI agents** — many agent frameworks (especially API-aware ones like
  Auto-GPT-style scaffolds) consume apis.guru as a source of "discoverable
  APIs to call."

## Acceptance criteria from apis.guru

- ✅ Public — anyone can hit `/api/v1/openapi` without auth
- ✅ Persistent — long-lived API, not for a single event
- ✅ Useful — provides marketing-action pricing + execution endpoints

## After it lands

- The API shows up at `https://api.apis.guru/v2/specs/socialperks.io/1.0.0/openapi.json`
- It's auto-updated weekly from your live URL
- Tracker integrations (apitracker.io etc.) pick it up automatically
