/**
 * A tab older than 15 minutes: the access cookie has gone, so the campaign
 * list gets 401. The analytics page must renew the cookie and show the
 * numbers, not "Failed to load analytics".
 */
import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { expiredAccess, fakeApi, listOf, refreshAccepted, testCampaign } from "@/__tests__/helpers/fake-api";
import { PortalAnalytics } from "../portal-analytics";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renews an expired access cookie and shows the campaign numbers", async () => {
  const api = fakeApi({
    "GET /api/v1/campaigns": [expiredAccess, listOf("campaigns", [testCampaign])],
    "POST /api/v1/auth": [refreshAccepted],
  });

  render(<PortalAnalytics businessId="biz_usr_test_1" />);

  expect(await screen.findByText("Perk Value")).toBeInTheDocument();
  expect(screen.queryByText("Failed to load analytics")).not.toBeInTheDocument();
  expect(screen.getByText("$45")).toBeInTheDocument(); // the campaign's spent budget
  expect(api.sent("GET /api/v1/campaigns").map((r) => r.url)).toEqual([
    "/api/v1/campaigns?businessId=biz_usr_test_1",
    "/api/v1/campaigns?businessId=biz_usr_test_1",
  ]);
});
