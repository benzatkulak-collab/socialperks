import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthForm } from "../auth-form";
import { createSeedData } from "@/lib/seed";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

/** Get the submit button (not the tab) by finding the button that is NOT a tab */
function getSubmitButton(text: string) {
  const buttons = screen.getAllByText(text);
  const submit = buttons.find((b) => b.getAttribute("role") !== "tab");
  if (!submit) throw new Error(`No submit button found with text "${text}"`);
  return submit;
}

function renderAuth(overrides = {}) {
  const defaults = {
    data: createSeedData(),
    save: vi.fn(),
    onBack: vi.fn(),
    onAuth: vi.fn(),
    onEnterpriseDemo: vi.fn(),
    ...overrides,
  };
  return { ...render(<AuthForm {...defaults} />), ...defaults };
}

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form by default", () => {
    renderAuth();
    expect(screen.getByPlaceholderText("you@business.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Your password")).toBeInTheDocument();
    expect(getSubmitButton("Log In")).toBeInTheDocument();
  });

  it("shows validation error when email is empty", async () => {
    renderAuth();
    fireEvent.click(getSubmitButton("Log In"));
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
  });

  it("shows validation error when password is empty", async () => {
    renderAuth();
    const emailInput = screen.getByPlaceholderText("you@business.com");
    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    fireEvent.click(getSubmitButton("Log In"));
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("switches to business signup tab", () => {
    renderAuth();
    fireEvent.click(screen.getByText("Business"));
    expect(screen.getByPlaceholderText("Your Business Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Coffee Shop, Yoga Studio, Tattoo Parlor...")).toBeInTheDocument();
  });

  it("switches to creator signup tab", () => {
    renderAuth();
    fireEvent.click(screen.getByText("Creator"));
    expect(screen.getByPlaceholderText("Your Creator Name")).toBeInTheDocument();
  });

  it("calls onAuth on successful login", async () => {
    const onAuth = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          token: "test-token",
          user: { id: "u1", name: "Test", email: "test@test.com", role: "business", businessId: "b1" },
          business: { id: "b1", name: "Test Biz", type: "Cafe", email: "test@test.com", pin: "", avatar: "☕", size: "small", location: "", industry: "Cafe" },
        },
      }),
    });

    renderAuth({ onAuth });
    fireEvent.change(screen.getByPlaceholderText("you@business.com"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Your password"), { target: { value: "password123" } });
    fireEvent.click(getSubmitButton("Log In"));

    await waitFor(() => {
      expect(onAuth).toHaveBeenCalledWith(
        expect.objectContaining({ id: "b1", name: "Test Biz" }),
        "business"
      );
    });
  });

  it("shows error on failed login", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, error: { message: "Bad credentials" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, error: { message: "Bad PIN" } }) });

    renderAuth();
    fireEvent.change(screen.getByPlaceholderText("you@business.com"), { target: { value: "bad@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Your password"), { target: { value: "wrong" } });
    fireEvent.click(getSubmitButton("Log In"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    });
  });

  it("shows demo accounts when toggled", () => {
    renderAuth();
    fireEvent.click(screen.getByText(/Try with demo accounts/));
    expect(screen.getByText(/Password for all demos:/)).toBeInTheDocument();
  });

  it("calls onEnterpriseDemo when enterprise button clicked", () => {
    const onEnterpriseDemo = vi.fn();
    renderAuth({ onEnterpriseDemo });
    fireEvent.click(screen.getByText(/Enterprise Demo/));
    expect(onEnterpriseDemo).toHaveBeenCalled();
  });

  it("validates signup requires name", async () => {
    renderAuth();
    fireEvent.click(screen.getByText("Business"));
    fireEvent.change(screen.getByPlaceholderText("you@business.com"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Min. 8 characters"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Create Business Account"));
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("validates signup requires password of 8+ chars", async () => {
    renderAuth();
    fireEvent.click(screen.getByText("Business"));
    fireEvent.change(screen.getByPlaceholderText("Your Business Name"), { target: { value: "My Cafe" } });
    fireEvent.change(screen.getByPlaceholderText("Coffee Shop, Yoga Studio, Tattoo Parlor..."), { target: { value: "Cafe" } });
    fireEvent.change(screen.getByPlaceholderText("you@business.com"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Min. 8 characters"), { target: { value: "short" } });

    // Need to accept terms too
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByText("Create Business Account"));
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });
});
