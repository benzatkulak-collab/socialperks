# @socialperks/cli

Agent-runnable CLI for [Social Perks](https://socialperks.io). Every command runs from a non-interactive shell — no browser, no clicks. Designed for AI agents, automation pipelines, and developers who don't want to leave the terminal.

## Quick start

```bash
# Create an account, get an API key, write .env.local — 30 seconds, zero browser
npx @socialperks/cli init --email you@example.com --business-name "Maria's Coffee"

# List campaigns
npx @socialperks/cli campaigns list --status active

# Create a campaign
npx @socialperks/cli campaigns create \
  --platform instagram --action ig_story \
  --reward-type pct --reward 15 \
  --name "Free Latte for an IG Story"

# Print the QR poster
npx @socialperks/cli poster --campaign cmp_abc123 --save poster.svg

# Wire post-purchase SMS
npx @socialperks/cli sms --campaign cmp_abc123 --phone +14155551234

# Ask the AI for the best campaign to launch first
npx @socialperks/cli ai quick-start --business-type coffee_shop --format table
```

## Why agent-runnable?

Every other "developer CLI" in this category drops you into a browser for OAuth. Agents can't click buttons. The Social Perks CLI provisions accounts and API keys via a single `POST /api/v1/dev/init` — non-interactive, idempotent, no human needed.

That's the whole reason this exists. It's the difference between "an agent can autonomously integrate Social Perks" and "an agent has to ask a human."

## Install globally (optional)

```bash
npm install -g @socialperks/cli
socialperks --help
```

## All commands

```
init                Create an account + write SOCIAL_PERKS_API_KEY to .env.local
whoami              Show the authenticated business
campaigns list      List campaigns
campaigns create    Create a campaign
actions list        List the action library
poster              Print or save the QR poster
sms                 Enqueue a post-purchase SMS
ai quick-start      Single-best campaign for a business type
health              Ping the API
```

## Global flags

```
--api-key <key>     Override SOCIAL_PERKS_API_KEY
--host <url>        Override base URL
--format json|table Output format (default json)
--non-interactive   Fail instead of prompting
```

## Environment variables

```
SOCIAL_PERKS_API_KEY       Authentication
SOCIAL_PERKS_BASE_URL      API base URL (default https://socialperks.io)
SOCIAL_PERKS_BUSINESS_ID   Used by `sms` subcommand if --business not passed
SOCIAL_PERKS_EMAIL         Used by `init` if --email not passed
SOCIAL_PERKS_BUSINESS_NAME Used by `init` if --business-name not passed
```

## License

MIT.
