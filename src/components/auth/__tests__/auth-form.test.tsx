import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthForm } from "../auth-form";
import { createSeedData } from "@/lib/seed";

const mockFetch = vi.fn();
global.fetch = mockFetch;

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
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders login form by default", () => {
    renderAuth();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@yourbusiness.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("At least 8 characters")).toBeInTheDocument();
  });

  it("shows validation error when email is empty", async () => {
    renderAuth();
    fireEvent.click(screen.getByText("Log In"));
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
  });

  it("shows validation error when password is empty", async () => {
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText("you@yourbusiness.com"), { target: { value: "test@test.com" } });
    fireEvent.click(screen.getByText("Log In"));
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("shows signup role picker when clicking sign up", () => {
    renderAuth();
    fireEvent.click(screen.getByText("Sign up free"));
    expect(screen.getByText(/I'm a business/)).toBeInTheDocument();
    expect(screen.getByText(/I'm a creator/)).toBeInTheDocument();
  });

  it("shows business signup form", () => {
    renderAuth();
    fireEvent.click(screen.getByText("Sign up free"));
    fireEvent.click(screen.getByText(/I'm a business/));
    expect(screen.getByPlaceholderText("Maria's Coffee Shop")).toBeInTheDocument();
  });

  it("shows creator signup form", () => {
    renderAuth();
    fireEvent.click(screen.getByText("Sign up free"));
    fireEvent.click(screen.getByText(/I'm a creator/));
    expect(screen.getByPlaceholderText("Your creator name")).toBeInTheDocument();
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
    fireEvent.change(screen.getByPlaceholderText("you@yourbusiness.com"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Log In"));

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
    fireEvent.change(screen.getByPlaceholderText("you@yourbusiness.com"), { target: { value: "bad@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByText("Log In"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    });
  });

  it("shows demo accounts when toggled", () => {
    renderAuth();
    fireEvent.click(screen.getByText(/Try a demo account/));
    expect(screen.getByText(/Password for all: 1234/)).toBeInTheDocument();
  });

  it("calls onEnterpriseDemo from signup screen", () => {
    const onEnterpriseDemo = vi.fn();
    renderAuth({ onEnterpriseDemo });
    fireEvent.click(screen.getByText("Sign up free"));
    fireEvent.click(screen.getByText(/Enterprise/));
    expect(onEnterpriseDemo).toHaveBeenCalled();
  });
});
