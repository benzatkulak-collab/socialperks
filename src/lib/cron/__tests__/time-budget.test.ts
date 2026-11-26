import { describe, it, expect } from "vitest";
import {
  createTimeBudget,
  cronTimeBudgetMs,
  DEFAULT_CRON_TIME_BUDGET_MS,
  UNLIMITED_BUDGET,
} from "../time-budget";

describe("createTimeBudget", () => {
  it("is not expired before the budget is spent and expired after", () => {
    let t = 1_000;
    const budget = createTimeBudget(500, () => t);
    expect(budget.expired()).toBe(false);
    expect(budget.remainingMs()).toBe(500);
    t = 1_499;
    expect(budget.expired()).toBe(false);
    t = 1_500;
    expect(budget.expired()).toBe(true);
    expect(budget.remainingMs()).toBe(0);
  });
});

describe("cronTimeBudgetMs", () => {
  it("defaults to 7s, which fits under Netlify Free's 10s function limit", () => {
    expect(cronTimeBudgetMs({})).toBe(DEFAULT_CRON_TIME_BUDGET_MS);
    expect(DEFAULT_CRON_TIME_BUDGET_MS).toBeLessThan(10_000);
  });

  it("honours CRON_TIME_BUDGET_MS and ignores junk", () => {
    expect(cronTimeBudgetMs({ CRON_TIME_BUDGET_MS: "20000" })).toBe(20_000);
    expect(cronTimeBudgetMs({ CRON_TIME_BUDGET_MS: "abc" })).toBe(DEFAULT_CRON_TIME_BUDGET_MS);
    expect(cronTimeBudgetMs({ CRON_TIME_BUDGET_MS: "-5" })).toBe(DEFAULT_CRON_TIME_BUDGET_MS);
  });
});

describe("UNLIMITED_BUDGET", () => {
  it("never expires", () => {
    expect(UNLIMITED_BUDGET.expired()).toBe(false);
  });
});
