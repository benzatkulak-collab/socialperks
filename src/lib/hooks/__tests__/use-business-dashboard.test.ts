// @vitest-environment happy-dom
/**
 * A tab older than 15 minutes: the access cookie has gone, so the campaign
 * list gets 401. The dashboard must renew the cookie and count the campaigns.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { expiredAccess, fakeApi, listOf, refreshAccepted, testCampaign } from "@/__tests__/helpers/fake-api";
import { useBusinessDashboard } from "../use-business-dashboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renews an expired access cookie and counts the business's active campaigns", async () => {
  const api = fakeApi({
    "GET /api/v1/campaigns": [
      expiredAccess,
      listOf("campaigns", [testCampaign, { ...testCampaign, id: "cmp_test_2", state: "paused" }]),
    ],
    "POST /api/v1/auth": [refreshAccepted],
  });

  const { result } = renderHook(() => useBusinessDashboard("biz_usr_test_1"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBeNull();
  expect(result.current.stats.activeCampaigns).toBe(1);
  expect(api.sent("GET /api/v1/campaigns").map((r) => r.url)).toEqual([
    "/api/v1/campaigns?businessId=biz_usr_test_1",
    "/api/v1/campaigns?businessId=biz_usr_test_1",
  ]);
  expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
});
