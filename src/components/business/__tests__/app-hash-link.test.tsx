import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

vi.mock("@/components/auth/auth-form", () => ({ AuthForm: () => <div data-testid="auth" /> }));
vi.mock("@/components/business/portal", () => ({ BusinessPortal: () => null }));
vi.mock("@/components/influencer/portal", () => ({ InfluencerPortal: () => null }));
vi.mock("@/components/enterprise/portal", () => ({ EnterprisePortal: () => null }));

import { SocialPerksApp } from "@/components/app";

afterEach(() => {
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

describe("sign-in hash on a deep link", () => {
  it("clears #login but keeps the link's query string", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
    window.history.replaceState(null, "", "/dashboard?tab=submissions&submission=sub_1#login");
    const { findByTestId } = render(<SocialPerksApp />);
    await findByTestId("auth");
    await waitFor(() => expect(window.location.hash).toBe(""));
    expect(window.location.pathname + window.location.search).toBe("/dashboard?tab=submissions&submission=sub_1");
  });
});
