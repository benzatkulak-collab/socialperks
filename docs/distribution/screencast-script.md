# Screencast Shooting Script — Social Perks Agent Demo

**Length target:** 90 seconds. **Use case:** the single most-leveraged
distribution asset for the X thread, dev.to body, and Discord post.

This script is engineered for one specific outcome: a developer who's
never heard of Social Perks watches it, understands what the platform
does in 60 seconds, and copies the install snippet at 90 seconds.

---

## Equipment

- **Recorder:** QuickTime (macOS) or OBS (cross-platform). Recording at
  1920×1080 is plenty; 4K is overkill and produces 30+ MB files that
  don't autoplay on X.
- **Microphone:** Whatever you have. Built-in MacBook mic is acceptable
  if you're in a quiet room. Skip the music — narration is enough.
- **Browser:** Chrome or Safari at 1280×800 window size (zoomed in
  enough that small UI text reads on mobile playback).
- **Terminal:** Light-on-dark theme, font ≥ 16pt. iTerm with the
  default dark theme works.

## Pre-recording checklist

1. Close all browser tabs except the ones used in the script.
2. Disable browser notifications (Mail, Slack, calendar popups).
3. Set system "Do Not Disturb" mode.
4. Open the three target tabs in this order:
   - Tab 1: <https://socialperks.app> (homepage, scrolled to top)
   - Tab 2: <https://socialperks.app/agent/test> (sandbox)
   - Tab 3: <https://registry.modelcontextprotocol.io/v0/servers?search=socialperks> (registry entry)
5. Have an iTerm window open beside the browser with the
   `examples/full-flow.ts` directory loaded but the file unopened.
6. Have `claude_desktop_config.json` open in a text editor in the
   background. We won't show it but the action will reference it.

---

## Storyboard

### Section 1 — 0:00 to 0:15 (15s) — Hook

**Visual:** Homepage hero. Slow zoom on the headline "Turn customers
into your marketing team."

**Narration:**

> *"Social Perks is a marketing platform for small businesses —
> coffee shops, restaurants, salons. Customers post about the business
> on Instagram or TikTok in exchange for a perk. The business gets
> word-of-mouth instead of paying for ads."*

**Cursor action:** Scroll down past the hero, pause briefly on the
"For developers + AI agents" strip.

---

### Section 2 — 0:15 to 0:40 (25s) — The agent-native pivot

**Visual:** Click on "Try MCP in browser →" link. Land on
`/agent/test`. The tools list is visible on the left.

**Narration:**

> *"What's worth showing is the agent side. There are ten MCP tools.
> Six need an API key — like creating a campaign — and four are free,
> like the pricing oracle and action catalog. Let me show you the
> pricing one in real time."*

**Cursor action:**

- Tools list is already on screen. Click `getPricing` if it's not
  already selected.
- Fill in `actionId`: `ig_st` (Instagram Story Tag).
- Fill in `businessType`: `restaurant`.
- Click **Send**.

**Visual:** Response panel populates. The `_meta` badges show
`durationMs`, `cost: free`, and `rateLimit` remaining.

**Narration (while the response renders):**

> *"Every tool call comes back with a cost-meter envelope — duration,
> what it cost, and rate-limit remaining. So an agent can budget
> before invoking and verify after. That's the bit I think is
> actually novel."*

---

### Section 3 — 0:40 to 1:00 (20s) — OAuth flow

**Visual:** Click "🔒 createCampaign" in the tools list. The amber
"Requires API key" panel appears.

**Narration:**

> *"For the write tools, agents need an API key. But agents can't
> walk a user through a developer dashboard. So I built an OAuth-style
> consent flow."*

**Cursor action:** Click "Get one via the OAuth flow" link. New tab
opens at `/agent/authorize?...` showing the consent screen.

**Visual:** The consent screen with plain-English scope descriptions
("View your active and past campaigns," "Create and launch new
campaigns," etc.).

**Narration:**

> *"The agent sends the user here. The user signs in, sees the scopes
> in plain English, hits Approve. The agent gets a single-use code,
> exchanges it for an API key. RFC 6749 close enough that any OAuth
> client library can drive it."*

---

### Section 4 — 1:00 to 1:20 (20s) — Claude Desktop install

**Visual:** Cmd-W close the consent tab. Switch to the homepage tab.
Scroll to the `#install` section. The compact "Use Social Perks from
Claude Desktop" strip is visible.

**Narration:**

> *"Or if you're on Claude Desktop, there's a one-click install."*

**Cursor action:** Click "Copy config snippet." The button flips to
"✓ Copied." Switch to the text editor with
`claude_desktop_config.json` open, Cmd-V paste, save, switch back
to browser.

**Narration:**

> *"Paste into your Claude config, restart Claude, the Social Perks
> tools appear in the picker. Done in under thirty seconds."*

---

### Section 5 — 1:20 to 1:30 (10s) — Close

**Visual:** Switch to the third tab, the official MCP Registry
listing for `io.github.benzatkulak-collab/socialperks`. The entry is
visible.

**Narration:**

> *"It's listed in the official MCP Registry. Links in the post.
> Sandbox is at socialperks.app/agent/test."*

**Cursor action:** Fade to black or freeze on the registry entry.

---

## Post-recording

- **Trim:** Cut any pauses > 0.5s. End on the registry tab.
- **Captions:** Auto-generate via macOS Live Captions or Descript.
  Burn them in — most viewers watch with sound off.
- **Length:** Final cut should be 80-95s. Tight is the point.
- **Aspect:** 16:9 for dev.to / HN, vertical 9:16 cut for X if
  budget allows. The 16:9 version is the priority.
- **Filename:** `social-perks-agent-demo-90s.mp4` so it sorts well.
- **Hosting:** Upload to Loom (best for embedded playback) AND
  YouTube (best for SEO). The Loom link goes in the X thread; the
  YouTube link goes in the dev.to body.

## What NOT to include

- **No comparisons** to other platforms. The demo is a what-it-is,
  not a why-it's-better.
- **No price talk.** The free tools are the demo. Pricing comes up
  if someone clicks through.
- **No B-roll** of stock office footage. The terminal + browser
  is the whole show.
- **No background music.** It dates the video and competes with
  narration.
- **Don't show the dashboard.** It's tempting but it's small-biz
  UI and pulls the demo off-message.

## Backup script (if 90s feels too long)

Cut Section 4 entirely. Drop the Claude Desktop install down to the
written post and let the video be: hook → sandbox demo → OAuth
consent → registry. That's 70 seconds and just as effective for
the X thread, which is the channel where 70s outperforms 90s.

## Why this script is shaped this way

Three principles:

1. **Show the most novel thing first that costs nothing to try.** The
   sandbox is the unique-to-Social-Perks asset (most MCP servers
   don't have a self-serve test page). Putting it at 0:15-0:40 means
   anyone bailing early still saw the most differentiated thing.

2. **OAuth in the middle, not the end.** OAuth flows look complicated
   even when they aren't. Showing the consent screen visually
   communicates "this is solved" in 3 seconds. Putting it last would
   leave viewers with "this is the hard part" as the final image.

3. **Close on the registry, not on a CTA.** A CTA is what the
   post-text does. The video's job is to establish credibility — the
   official MCP Registry listing is the strongest credibility signal.
