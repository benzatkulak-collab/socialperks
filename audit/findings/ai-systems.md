# Phase 9 — AI & Automation Audit (Social Perks)

**Auditor role:** AI Systems Architect. **Method:** read-only, evidence-quoted.
**Date:** 2026-06-02. **State:** pre-launch, 0 users.

---

## 0. Headline verdict

**There is no AI in Social Perks in the sense a customer would assume.** Zero LLM
SDKs, zero model inference, zero external AI calls anywhere in the repo
(confirmed: no `anthropic`/`openai`/`ai-sdk`/`langchain`/`tensorflow`/`onnx`/
`@xenova` in any of the 5 `package.json` files, and no `messages.create` /
`chat/completions` / `new OpenAI` / `new Anthropic` in source). The "backend AI
engine" is **templates + keyword regex + lookup tables + fixed-coefficient
arithmetic**, all fully deterministic.

That said, the codebase is **not all theater**. There is one piece of *real* ML
(a from-scratch logistic-regression fraud classifier), one *real* HTTP
verification path (`url-checker.ts`), a genuinely useful *rules-based* fraud
engine (shingling/dup detection), and a competent *agent control-plane*
framework. The problems are: (a) the headline "AI" is template-fill sold as a
metered paid feature; (b) huge volumes of impressive-looking ML/embedding code
are **dead** (imported only by their own tests); (c) `verification-engine.ts` is
a confidence-number stub dressed up as platform API verification; (d) ROI/reach
numbers shown to paying customers are invented constants.

**One line:** *It is not AI — it is a well-built deterministic
template/rules/heuristic system with a thin layer of real-but-circular ML, and
the word "AI" is doing marketing work the code does not back up.*

---

## 1. Per-feature technique table

| Feature | Entry point | Technique | Deterministic? | Honest "AI"? |
|---|---|---|---|---|
| Campaign generation | `POST /ai/generate` → `generateCampaigns` (`ai-engine.ts:233`) | **Template-fill** + keyword regex trait detection (`detectTraits` `ai-engine.ts:36`) | Yes | **No — AI-washing** |
| Full marketing plan | `POST /ai/campaign-agent` → `marketingAgent.generatePlan` (`ai-agent/agent.ts:41`) | Template-fill + string interpolation; phases hardcoded | Yes | **No — AI-washing** |
| Quick-start rec | `POST /ai/quick-start` → `generateQuickStart` (`ai-agent/agent.ts:135`) | Returns `recommendations[0]` (top of a sorted rule list) | Yes | **No** |
| Recommendations | `POST /ai/recommend` → `getRecommendations` (`ai-engine.ts:495`) | Rules: +30/+25/+20 point buckets by goal/tier/category | Yes | **No** (honest *as rules*) |
| ML recommendations | `GET /recommendations` → `getNicheAffinity` (`matching-engine.ts`) | Lookup-table niche affinity | Yes | Partial |
| Pricing oracle | `GET /pricing` → `estimatePricing` (`ai-engine.ts:576`) | Lookup table `getActionBaseValue` × trait multipliers | Yes | **No — "simulated market data"** |
| Benchmarks | `GET /benchmarks` → `getBenchmarks` (`ai-engine.ts:641`) | Hardcoded constants per trait | Yes | **No — fabricated stats** |
| ROI / reach / CPA projections | `recommendation-builder.ts:60-79` | Fixed-coefficient arithmetic (reach×0.012, etc.) | Yes | **No — invented numbers** |
| Embeddings (wired) | `embedding-engine.ts` → semantic-search, graph, recommendations routes | **Hash-based feature vectors** (djb2 `5381`, `embedding-engine.ts:1033`) + real cosine | Yes | Misleading ("embeddings" implies learned) |
| Embeddings (dead) | `ml/embedding-system.ts` (1146 lines) | FNV-1a hash + one-hot features + real cosine KNN | Yes | **Dead code** |
| Matching | `matching-engine.ts` (23KB) | Weighted feature scoring | Yes | Honest as heuristic; mostly unused |
| Fraud — rules | `POST /ai/review` → `checkSubmission` (`fraud-detection.ts:636`) | **Real heuristics**: shingling dup-detect, rapid-fire, account-age, self-review, copy-paste fingerprint | Yes | **Yes — legit, no AI claim needed** |
| Fraud — ML | `POST /ai/review` → `predictFromSubmission` (`ai/review/route.ts:142`) | **Real logistic regression**, gradient descent (`fraud-model.ts:96`) | Yes (seed 42) | Real ML — but **circular** (see §3) |
| Fraud pipeline (dead) | `ml/fraud-pipeline.ts` (1636 lines): Logistic/Rules/**Ensemble** models | Real-ish ML ensemble | — | **Dead code** (tests only) |
| Verification | `POST /ai/review` → `verificationEngine.verify` (`verification-engine.ts:142`) | **Stub**: hardcoded confidence by proofType + `Math.random` latency | No (random delay) | **No — theater** |
| URL proof check | `checkProofUrl` (`verification/url-checker.ts:221`) | **Real HTTP** fetch + SSRF guard + domain match | Yes | **Yes — genuinely real** |
| Compliance / FTC | `checkCampaignCompliance` (`compliance-engine.ts:801`), `legalGuard` | Lookup table of per-platform rules + validation; incentivizable/non-incentivizable separation | Yes | **Yes — real & valuable** |
| Autonomous agents | `agents/*` + `agentRegistry` (`agents/registry.ts`) | Rule-based workers + dispatcher (modes/audit/cron) | Yes | Real automation, **not** AI agents |
| MCP server | `POST /api/mcp` | JSON-RPC 2.0 wrapping existing reference APIs | Yes | Real, well-built |

---

## 2. What the "AI" actually does — quoted evidence

### 2.1 Campaign generation = template-fill + regex
`detectTraits` is a wall of regex (`ai-engine.ts:36-56`):
```ts
visual: /salon|spa|tattoo|bakery|florist|restaurant|.../i.test(t),
food:   /restaurant|cafe|coffee|bakery|bar|brewery|.../i.test(t),
```
`generateCampaigns` then emits hardcoded campaign objects gated by those booleans
(`ai-engine.ts:245-470`), e.g.:
```ts
if (traits.food)
  add("TikTok Taste Test", "Genuine reaction trying your food.", ["tt_rv"], 20, "pct",
      "Social", "premium", "Food reaction videos are TikTok's most shareable format.", ...);
```
No model, no generation — the same business type always yields the same campaign
list (modulo `new Date().getMonth()` seasonal block at `ai-engine.ts:467-470`).
The "reasons" strings ("16% higher lifetime value", `:431`; "2x reach", `:309`)
are copywriting baked into the template, presented as data-driven insight.

### 2.2 Pricing & benchmarks = fabricated constants
`estimatePricing` admits it inline (`ai-engine.ts:591`):
```ts
// Simulated market data (would come from DB in production)
const baseValue = getActionBaseValue(actionId);   // a lookup table, :608
```
`getBenchmarks` returns hardcoded `avgCompletionRate`/`avgROI` per trait
(`ai-engine.ts:650-674`): `if (traits.food) { avgCompletionRate = 55; avgROI = 4.1; }`.
These are surfaced via public cached endpoints as "industry benchmarks." With 0
users there is no industry data — these are made up.

### 2.3 ROI projections shown to paying customers are invented math
`recommendation-builder.ts:74-79`:
```ts
const estimatedReach = Math.round(totalActionValue * params.reachMultiplier * 100);
const estimatedNewCustomers = Math.max(2, Math.round(estimatedReach * 0.012)); // 1.2% conv, invented
const estimatedROI = ... (estimatedNewCustomers * avgTx) / monthlyDiscountCost ...;
```
`agent.ts:60` then renders `Expected ROI: ${avgROI.toFixed(1)}x within the first
3 months`, and `projectROI` (`agent.ts:169`) fabricates conservative/realistic/
optimistic bands by multiplying by 0.6 / 1.0 / 1.8. **These specific numbers are
presented as projections to businesses deciding how to spend money.**

### 2.4 Determinism
`grep Math.random` across `ai-engine.ts` and `ai-agent/`: **none** (only
`crypto.randomUUID` for IDs). The generation surface is 100% deterministic — fine
for a rules engine, but disqualifying for the "AI" label.

---

## 3. Matching & ML — real vectors or fake hashes?

### 3.1 Embeddings are hash/feature encodings, not learned vectors
Both embedding modules build vectors from **deterministic string hashing + one-hot
feature engineering**, then do *real* cosine similarity. They are honest "vector
search" but dishonest "embeddings" (the word implies a learned semantic model).

`ml/embedding-system.ts` (header literally says "Real vector store") uses FNV-1a:
```ts
function fnv1aHash(str: string): number { let hash = 0x811c9dc5; ... }   // :152
function hashToFloats(str, count) { ... push(hashToFloat(`${str}_${i}`)) } // :172
```
`embedInfluencer` (`:519`) fills dims with niche one-hots, `Math.log10(followers)/7`,
tier constants — feature engineering, not embedding. **Crucially this entire 1146-line
file is imported only by `__tests__/embedding-system.test.ts` — it is dead in the app.**

`embedding-engine.ts` (the *wired* one, used by `search/semantic-search.ts` →
`/discover`, `/recommendations`, and `graph/discovery` → `/graph`) does the same
with djb2:
```ts
function hashStringToFloat(s) { let hash = 5381; ... }   // embedding-engine.ts:1033
vec[31] = hashStringToFloat(campaign.category);          // :430
```
So Social Perks ships **two parallel implementations of the same fake-embedding
idea** — one live, one dead.

### 3.2 "ML training" is real mechanically but circular epistemically
`fraud-model.ts` is a genuine from-scratch logistic regression: sigmoid (`:73`),
binary cross-entropy (`:79`), gradient descent (`train` `:234`: `w_i -= lr*error*x_i`),
min-max normalization, weight export/import. The `/ml/train` route reports real
precision/recall/F1/AUC (AUC via trapezoidal ROC, `fraud-training.ts:343`).

**But the training data is synthetic, generated from the same hand-coded fraud
rules the model is meant to "learn":** `generateFraudulentSubmission`
(`fraud-training.ts:102`) hardcodes "new account spam" = `accountAgeDays: 0-2,
approvalRate: 0-30%`, "bot" = `platformDomainMatch: false, hourOfDay: 1-5am`, etc.
The model therefore re-derives the author's rules and is evaluated on the same
distribution → the impressive AUC is **measuring how well a linear model fits a
linear rule set the author wrote**. It cannot discover any signal not already
encoded. It is "real ML" you could put on a slide, but it adds little over the
rules and proves nothing about real fraud.

It *is* wired into production (`ai/review/route.ts:118-142`) and used as an
escalation gate (`:221`: `if (mlFraudScore > 0.8 && verdict === "approved")
verdict = "manual_review"`). Note in stateless context most features are
hardcoded defaults (`accountAgeDays: 90`, `followerCount: 0`, `:120-140`), so in
practice the live model sees almost-constant input → near-constant score.

### 3.3 Dead duplication
`ml/fraud-pipeline.ts` (1636 lines: `LogisticRegressionModel`, `RulesBasedModel`,
`EnsembleModel`) is imported **only by its own tests** — a third, more elaborate
fraud model that nothing in the app uses.

---

## 4. Fraud & verification — value vs theater

### 4.1 `fraud-detection.ts` — REAL value
This is the best-engineered "intelligence" in the repo. Genuine signals:
- **Near-duplicate content via shingling** (`extractShingles:138`, `findCandidates:149`,
  `stringSimilarity:245`) — catches reused proof text across submissions.
- **URL dup detection** with normalization (`checkDuplicate:290`, `normalizeUrl:202`).
- **Copy-paste fingerprinting** (`checkCopyPasteContent:422`, `fingerprint:233`).
- Rapid-fire (`:315`), account-age (`:335`), self-review (`:348`,
  ownedBusinessIds), engagement-manipulation (`:544`).

These are legitimate, cheap, and catch the obvious abuse classes. No "AI" claim
attached — appropriately honest. **What it catches:** duplicate/reused proofs,
spray submissions, owners reviewing themselves, copy-pasted content. **What it
can't catch:** whether the proof URL actually shows the required action (needs
real platform verification — see §4.2).

### 4.2 `verification-engine.ts` — THEATER
The "platform verification" is a stub returning **hardcoded confidence by proof
type** (`:142-204`):
```ts
} else if (submission.proofType === "screenshot") {
  confidence = 0.55;
  details.note = "Screenshot submitted; OCR integration (Tesseract.js) WOULD extract text...";  // :184
} else if (submission.proofType === "api_verified") {
  confidence = 0.95;
  details.note = "Pre-verified via Instagram Graph API OAuth flow";  // :189  (no such call exists)
}
```
It even fakes work with `await simulateLatency(100, 400)` (`:144`, the lone
`Math.random` at `:95`) and labels the method `"screenshot_ocr"` (`:214`) though
no OCR runs. The only genuine signal is URL-domain matching (`urlMatchesPlatform`,
`:154`) — which **duplicates** the real `url-checker.ts`. Net: an `api_verified`
submission auto-clears at 0.95 confidence based purely on a string the client
sent. **This is the single most misleading "verification" surface.**

### 4.3 `url-checker.ts` — REAL
By contrast this does an actual `fetch` (`:221`) with `AbortController` timeout,
SSRF protection (`isSafeUrl`, `:9`), redirect tracking, and domain matching
against a real platform→domain map. The `/ai/review` route correctly uses it to
downgrade unreachable/mismatched URLs (`ai/review/route.ts:204-218`). This is the
verification that should be the *primary* gate; instead it runs alongside the
theater engine.

---

## 5. Agent / automation surface

**Coherent and functional as rule-based automation — not AI agents.** No LLM, no
planning, no tool-use reasoning. The story is "scheduled rule-workers with a
human-gated control plane," and that story is real.

- `agentRegistry` (`agents/registry.ts`) is a clean dispatcher: modes
  `off`/`dry-run`/`live`, per-agent thresholds, `maxActionsPerRun` cap, full audit
  of every decision (`:170`), ring buffer of recent decisions. Well-designed.
- 12 agents (`acquisition`, `fraud-sentinel`, `submission-reviewer`,
  `billing-recovery`, `payout-runner`, `campaign-optimizer`, etc.). They genuinely
  query the DB and (in live mode) act — e.g. `acquisition-agent.ts:48` runs real
  SQL against `waitlist`, gracefully no-ops without `DATABASE_URL`.
- **Caveat — weaker than advertised:** `submission-reviewer.ts` docstring says it
  "Looks up the fraud score from fraud-detection," but actually uses its own toy
  `quickScore` (`:49`: URL length + a 4-host shortener blocklist) — **not** the ML
  model or the real fraud engine. So the autonomous reviewer is far dumber than
  the `/ai/review` route.
- **Cron is not wired:** `cron/agents/route.ts` is **not in `vercel.json`** (header
  `:7-13` admits the cron budget is spent elsewhere). Agents only fire via the
  "Run now" admin button today. So "autonomous agents transact unattended" is
  **aspirational** — the plumbing exists, the schedule does not.
- **MCP server** (`api/mcp/route.ts`) is real JSON-RPC 2.0, exposes reference
  tools, and even has a per-tool **cost model** (`free`/`plan`/`cash`, `:67`) so
  external agents can reason about spend. Paired with the `agent-auth/{token,
  approve}` OAuth-style flow (`agent-auth/token/route.ts`) and `exchange/enroll`
  (auto-generates sell orders from agent capabilities). **What it's FOR:** letting
  third-party/customer AI agents query pricing and transact on the perks exchange.
  It's the most genuinely forward-looking part — but it's infrastructure for
  *other people's* AI, not AI Social Perks runs.

---

## 6. Governance, monitoring, feedback, FTC

- **Human review:** `/ai/review` correctly routes ambiguous cases to
  `manual_review` and admins can override. Good.
- **Guardrails on generated plans/recs:** **none beyond billing metering.** AI
  output goes straight to the user. There is no quality gate, no "this is an
  estimate" disclaimer on the fabricated ROI numbers, no confidence flooring that
  reflects the lack of data (confidence is itself a made-up constant).
- **Metering:** every `/ai/*` route enforces a plan limit (`_enforce-ai-limit.ts`
  → `checkAiGenerationLimit`) and records usage. **This means template output is
  sold as a metered "AI generation" paid feature** — the central honesty/legal
  exposure.
- **Feedback loop to improve outputs:** **none.** No outcome is fed back into
  generation/recommendation. The only "training" is the circular synthetic fraud
  model (§3.2). Nothing learns from real campaign performance.
- **FTC auto-injection — the docs overstate it.** CLAUDE.md says disclosure is
  "Auto-injected per platform. Cannot be disabled." The code **validates and
  advises** but does **not** inject: `getRequiredDisclosures` (`compliance-engine.ts:620`)
  *returns* recommended text; `validateContentDisclosure` (`:676`) / `checkReviewCompliance`
  (`:763`) *check* whether `#ad` is present and flag issues. Disclosure is never
  written into the content the user actually posts. **The genuinely valuable part**
  is `legalGuard` (`legal-compliance.ts`): it enforces incentivizable
  vs non-incentivizable separation (e.g. you may incentivize an IG post but not a
  Google/Yelp review). That is the real legal landmine and the code handles it
  correctly (`isActionIncentivizable:410`, briefing at `:237`).

---

## 7. Findings ranked (Critical → Low)

| # | Sev | Finding (evidence) | Why it matters | Verdict |
|---|---|---|---|---|
| 1 | **Critical** | Template/keyword output sold as metered "AI" (`_enforce-ai-limit.ts` gates `generateCampaigns`/`marketingAgent`, both pure templates `ai-engine.ts:233`, `ai-agent/agent.ts:41`) | Charging for "AI generations" that contain no model = false-advertising / consumer-protection risk at launch | **make-real-LLM** (or rename) |
| 2 | **Critical** | ROI/reach/CPA shown as projections are invented constants (`recommendation-builder.ts:74`: reach×0.012; `agent.ts:60` "Expected ROI: Nx") | Businesses make spend decisions on fabricated numbers; 0 data backs them; legal + trust risk | **make-real** (or label "illustrative estimate, not a forecast") |
| 3 | **High** | `verification-engine.ts` is a stub returning hardcoded confidence; `api_verified`→0.95 with no API call; fake `simulateLatency` (`:144,189`) | The core "did they actually do the action?" check is theater; fraud passes if client claims `api_verified` | **make-real** (OAuth read APIs) or **remove** and rely on `url-checker` |
| 4 | **High** | "Industry benchmarks" / pricing are hardcoded per-trait constants surfaced as data (`ai-engine.ts:591` "Simulated market data", `:650`) | Public endpoints present fiction as market intelligence | **keep-as-heuristic but relabel** ("starting estimates") |
| 5 | **High** | Docs claim FTC disclosure "auto-injected, cannot be disabled" — code only validates/advises (`compliance-engine.ts:620,676`) | Founders/customers may believe they're auto-compliant when they are not; FTC exposure | **make-real** (inject) or fix docs |
| 6 | **Medium** | ML fraud model trains on synthetic data generated from its own target rules (`fraud-training.ts:102`) → circular; reported AUC meaningless | "ML-powered fraud" claim isn't supported; model adds ~nothing over rules | **keep-as-heuristic** (drop ML framing until real labels exist) |
| 7 | **Medium** | ~4,000+ lines of dead ML/embedding code: `ml/embedding-system.ts` (1146), `ml/fraud-pipeline.ts` (1636, Ensemble), shipped but imported only by tests | Maintenance burden, audit confusion, inflates "14 engines / vector embeddings" claims | **remove** (or wire one, delete the dupe) |
| 8 | **Medium** | Two parallel embedding impls; only `embedding-engine.ts` (djb2) is wired (semantic-search/graph), `embedding-system.ts` (FNV-1a) is dead | Duplicate concept, both hash-based "embeddings" (misnomer) | **remove dead one; rename "vector match"** |
| 9 | **Medium** | `submission-reviewer` agent uses toy `quickScore` (URL length + 4 shorteners, `:49`), not the real fraud engine its docstring claims | Autonomous auto-approve/reject path is far weaker than `/ai/review`; could auto-approve fraud in live mode | **keep but wire to real `checkSubmission`** |
| 10 | **Medium** | Autonomous-agent scheduling not actually enabled (`cron/agents` not in `vercel.json`, `:7`) | "Autonomous agents" is currently manual-button-only; gap between story and reality | **keep** (wire cron when ready) — honest today |
| 11 | **Low** | `/ai/review` ML features mostly hardcoded in stateless path (`route.ts:120-140`: accountAge 90, followers 0) → near-constant ML score | The one live ML call sees near-constant input; escalation gate rarely meaningful | **keep**, fix by passing real history |
| 12 | **Low** | `matching-engine.ts` (23KB) largely unused — only `getNicheAffinity` reaches a route | Dead weight | **remove unused exports** |

---

## 8. Build / Cut / Make-real — where a real LLM earns its cost

**Highest value, lowest risk — make real with a small Anthropic integration:**

1. **Campaign-plan & quick-start copy** (`/ai/campaign-agent`, `/ai/quick-start`).
   This is the marquee "AI" and the easiest honest win: feed the business type +
   goals + the *deterministic rule output* (campaign list, legal briefing) into a
   single Claude call to produce genuinely tailored strategy prose, naming, and
   reasoning. Keep the rules engine as the structured backbone (cheap, safe,
   compliant), let the LLM do the language. Low risk (output is advisory text),
   high perceived value, directly justifies the "AI" label and the metering. **#1
   recommendation.**

2. **Submission review / proof reasoning** (`/ai/review`). A vision-capable Claude
   call on a screenshot proof would do the verification the current stub only
   pretends to (`verification-engine.ts`). Highest *operational* value (real fraud
   prevention), but higher cost/latency and needs guardrails + human fallback —
   stage it behind the existing `manual_review` path.

**Keep as honest heuristics (do NOT LLM-ify):**
- `fraud-detection.ts` rules (dup/shingle/rapid-fire) — cheap, deterministic, real.
- `legalGuard` incentivizable separation — must stay deterministic for compliance.
- Pricing/benchmarks — keep as estimates but **relabel** honestly until real data.
- MCP server + agent control plane — solid infra, no LLM needed.

**Remove:**
- `ml/embedding-system.ts`, `ml/fraud-pipeline.ts` (dead duplicates).
- The synthetic-data ML fraud model framing (`fraud-model.ts` + `fraud-training.ts`):
  either keep the rules and drop the "ML" claim, or replace with a real model
  trained on real labels *after* launch.
- `verification-engine.ts` theater — fold the one real check (domain match) into
  `url-checker.ts` and delete the rest, or replace with #2 above.

**Rename, regardless of LLM decision:** stop calling hash-feature cosine
"embeddings/ML," and put an honest "estimate, not a forecast" disclaimer on every
projected ROI/reach number (#2) before a single customer sees them.

---

## 9. Fairness note
This is competent, well-tested deterministic software (61 test files;
`/ai/review` composes rules+ML+real-HTTP+compliance sensibly; the agent control
plane and MCP server are above-average). The issue is **not** code quality — it's
the gap between the "AI/ML/embeddings/autonomous-agents" marketing and a reality
that is templates, rules, lookup tables, hash-features, and one circular linear
model. Pre-launch with 0 users, this is the ideal moment to either (a) make the
flagship generation paths genuinely LLM-backed, or (b) retire the "AI" framing —
but shipping metered "AI" that is template-fill, plus fabricated ROI numbers, is
the thing to fix before taking money.
