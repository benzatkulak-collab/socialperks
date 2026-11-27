/**
 * A tab older than 15 minutes: the access cookie has gone, so the three reads
 * the wallet makes at once all get 401. One renewal must serve all three, and
 * the wallet must show the creator's submissions.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  expiredAccess,
  fakeApi,
  listOf,
  okWith,
  refreshAccepted,
  testSubmission,
} from "@/__tests__/helpers/fake-api";
import { PerkWallet } from "../perk-wallet";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renews an expired access cookie once and shows the creator's submissions", async () => {
  const api = fakeApi({
    "GET /api/v1/submissions": [expiredAccess, listOf("submissions", [testSubmission])],
    "GET /api/v1/payouts": [expiredAccess, okWith({ account: null, payouts: [], totalPaid: 0, pendingAmount: 0 })],
    "GET /api/v1/wallet": [expiredAccess, okWith({ wallets: [], totalAvailable: 0, activeCount: 0 })],
    "POST /api/v1/auth": [refreshAccepted],
  });

  render(<PerkWallet influencerId="usr_test_2" influencerName="Test Creator" />);

  expect(await screen.findByText("2026-03-01")).toBeInTheDocument(); // the submission's row
  expect(screen.queryByText("No perks yet")).not.toBeInTheDocument();
  expect(api.sent("GET /api/v1/payouts")).toHaveLength(2);
  expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
});
