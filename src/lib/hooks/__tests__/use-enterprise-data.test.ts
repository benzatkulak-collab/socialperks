// @vitest-environment happy-dom
/**
 * A tab older than 15 minutes: the access cookie has gone, so both reads the
 * enterprise dashboard makes at once get 401. One renewal must serve both.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  expiredAccess,
  fakeApi,
  listOf,
  refreshAccepted,
  testCampaign,
  testSubmission,
} from "@/__tests__/helpers/fake-api";
import { useEnterpriseData } from "../use-enterprise-data";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renews an expired access cookie once and loads campaigns and submissions", async () => {
  const api = fakeApi({
    "GET /api/v1/campaigns": [expiredAccess, listOf("campaigns", [testCampaign])],
    "GET /api/v1/submissions": [expiredAccess, listOf("submissions", [testSubmission])],
    "POST /api/v1/auth": [refreshAccepted],
  });

  const { result } = renderHook(() => useEnterpriseData("biz_usr_test_1"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBeNull();
  expect(result.current.locations).toHaveLength(1);
  expect(result.current.locations[0]).toMatchObject({ activeCampaigns: 1, totalCompletions: 7, completionRate: 100 });
  expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
});
