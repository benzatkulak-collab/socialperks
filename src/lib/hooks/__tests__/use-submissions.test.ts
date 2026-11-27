// @vitest-environment happy-dom
/**
 * A tab older than 15 minutes: the access cookie has gone, so the first read
 * gets 401. The hook must renew the cookie and show the list, not an error.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { expiredAccess, fakeApi, listOf, refreshAccepted, testSubmission } from "@/__tests__/helpers/fake-api";
import { useSubmissions } from "../use-submissions";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renews an expired access cookie and loads the user's submissions", async () => {
  const api = fakeApi({
    "GET /api/v1/submissions": [expiredAccess, listOf("submissions", [testSubmission])],
    "POST /api/v1/auth": [refreshAccepted],
  });

  const { result } = renderHook(() => useSubmissions("usr_test_2"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBeNull();
  expect(result.current.submissions.map((s) => s.id)).toEqual(["sub_test_1"]);
  expect(api.sent("GET /api/v1/submissions").map((r) => r.url)).toEqual([
    "/api/v1/submissions?userId=usr_test_2",
    "/api/v1/submissions?userId=usr_test_2",
  ]);
  expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
});
