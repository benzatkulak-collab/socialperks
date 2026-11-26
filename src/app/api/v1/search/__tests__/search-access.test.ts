/**
 * GET /api/v1/search is anonymous (it backs a public search box), so it may
 * only ever return campaigns that are live offers right now. Drafts, paused
 * and ended campaigns stay out, including ones that were live when the
 * per-process index was built and changed state afterwards.
 *
 * The route indexes once per process, so these tests share one index and run
 * in order. All ids and names are made up.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { campaignManager } from "@/lib/campaign-state-machine";
import type { CampaignLifecycle } from "@/lib/campaign-state-machine";

const LIVE = "camp_test_search_live";
const LIVE_LATER_PAUSED = "camp_test_search_later_paused";
const PAUSED = "camp_test_search_paused";
const ENDED = "camp_test_search_ended";
const DRAFT = "camp_test_search_draft";

let ipCounter = 0;

async function search(q: string): Promise<{ status: number; ids: string[] }> {
  ipCounter += 1;
  const res = await GET(
    new NextRequest(`http://localhost/api/v1/search?q=${encodeURIComponent(q)}&limit=50`, {
      headers: { "x-nf-client-connection-ip": `10.4.0.${ipCounter}` },
    }),
  );
  const json = await res.json();
  return { status: res.status, ids: (json.data?.results ?? []).map((r: { id: string }) => r.id).sort() };
}

function launch(id: string): void {
  campaignManager.launch(id, "biz_test_search", {
    name: "Searchable sample offer",
    budgetAllocated: 5,
    budgetType: "dol",
    maxCompletions: null,
    expiresInDays: 30,
    actions: ["ig_st"],
  });
}

beforeAll(() => {
  campaignManager._reset();
  launch(LIVE);
  launch(LIVE_LATER_PAUSED);
  launch(PAUSED);
  campaignManager.pause(PAUSED, "usr_test_owner", "Paused for the test");
  launch(ENDED);
  campaignManager.end(ENDED, "usr_test_owner", "Ended for the test");
  const draft: CampaignLifecycle = {
    ...campaignManager.getState(LIVE)!,
    id: DRAFT,
    state: "draft",
    transitions: [],
  };
  campaignManager.register(draft);
});

describe("GET /api/v1/search", () => {
  it("returns live campaigns and nothing else", async () => {
    const { status, ids } = await search("searchable");
    expect(status).toBe(200);
    expect(ids).toEqual([LIVE, LIVE_LATER_PAUSED].sort());
  });

  it("drops a campaign that stopped being live after it was indexed", async () => {
    campaignManager.pause(LIVE_LATER_PAUSED, "usr_test_owner", "Paused after indexing");
    const { ids } = await search("searchable");
    expect(ids).toEqual([LIVE]);
  });
});
