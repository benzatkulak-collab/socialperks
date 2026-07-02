import { describe, it, expect } from "vitest";
import { shouldRunMigrationsOnBoot } from "../boot-migrate";

// The boot-time migration gate decides whether instrumentation.register()
// should run schema migrations. Migrations use the node `postgres` driver, so
// they must NEVER run on the edge runtime, and there is nothing to migrate
// without a real DATABASE_URL (the app falls back to volatile in-memory). An
// explicit kill-switch lets ops disable auto-migration if a deploy needs it.

describe("shouldRunMigrationsOnBoot", () => {
  it("runs in the node runtime when a database URL is present", () => {
    expect(
      shouldRunMigrationsOnBoot({
        runtime: "nodejs",
        databaseUrl: "postgres://user:pass@host:5432/db",
        disabled: false,
      }),
    ).toBe(true);
  });

  it("does NOT run on the edge runtime (no node postgres driver)", () => {
    expect(
      shouldRunMigrationsOnBoot({
        runtime: "edge",
        databaseUrl: "postgres://user:pass@host:5432/db",
        disabled: false,
      }),
    ).toBe(false);
  });

  it("does NOT run without a database URL (in-memory fallback — nothing to migrate)", () => {
    expect(
      shouldRunMigrationsOnBoot({
        runtime: "nodejs",
        databaseUrl: undefined,
        disabled: false,
      }),
    ).toBe(false);
  });

  it("does NOT run when explicitly disabled via the kill-switch", () => {
    expect(
      shouldRunMigrationsOnBoot({
        runtime: "nodejs",
        databaseUrl: "postgres://user:pass@host:5432/db",
        disabled: true,
      }),
    ).toBe(false);
  });

  it("treats an empty-string database URL as absent", () => {
    expect(
      shouldRunMigrationsOnBoot({
        runtime: "nodejs",
        databaseUrl: "",
        disabled: false,
      }),
    ).toBe(false);
  });
});
