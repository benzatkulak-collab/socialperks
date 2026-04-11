import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock next/dynamic to just render nothing (avoids dynamic import issues in tests)
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => null,
}));

// Mock socket.io — it's an optional production dependency not installed in test env.
// The realtime publisher imports socket-server which requires socket.io.
vi.mock("socket.io", () => ({
  __esModule: true,
  Server: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    to: vi.fn().mockReturnThis(),
    close: vi.fn(),
  })),
}));

// Mock crypto.randomUUID for environments that don't support it
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "00000000-0000-0000-0000-000000000000" },
  });
} else if (typeof globalThis.crypto.randomUUID !== "function") {
  globalThis.crypto.randomUUID = () => "00000000-0000-0000-0000-000000000000" as `${string}-${string}-${string}-${string}-${string}`;
}
