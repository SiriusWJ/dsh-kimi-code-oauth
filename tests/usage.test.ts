import { describe, expect, it } from "vitest";
import { parseKimiUsage } from "../src/usage.ts";

/** Trimmed live payload captured from api.kimi.com/coding/v1/usages. */
const LIVE = {
  usage: { limit: "100", remaining: "100", resetTime: "2026-10-05T15:03:48.253187Z" },
  limits: [
    {
      window: { duration: 300, timeUnit: "TIME_UNIT_MINUTE" },
      detail: { limit: "100", remaining: "100", resetTime: "2026-09-29T11:03:48.253187Z" },
    },
  ],
  usages: {
    limit_5h: { used_ratio: 0, reset_time: "2026-09-29T11:03:47Z" },
    limit_7d: { used_ratio: 0, reset_time: "2026-10-05T15:03:47Z" },
  },
};

describe("parseKimiUsage", () => {
  it("projects the 5-hour and 7-day windows the Kimi usage page shows", () => {
    const usage = parseKimiUsage(LIVE, 1000);
    expect(usage.windows.map((window) => window.key)).toEqual(["w5h", "w7d"]);
    expect(usage.windows.map((window) => window.remainingPercent)).toEqual([100, 100]);
    expect(usage.windows[0]?.resetAt).toBe("2026-09-29T11:03:47Z");
    expect(usage.fetchedAt).toBe(1000);
  });

  it("reads used_ratio as a 0..1 ratio and does not double count limits", () => {
    const usage = parseKimiUsage({
      ...LIVE,
      usages: { limit_5h: { used_ratio: 0.1342 }, limit_7d: { used_ratio: 0.44 } },
    });
    expect(usage.windows).toHaveLength(2);
    expect(usage.windows[0]?.usedPercent).toBeCloseTo(13.42, 6);
    expect(usage.windows[1]?.remainingPercent).toBeCloseTo(56, 6);
  });

  it("falls back to limit/remaining counts when usages is absent", () => {
    const { usages: _dropped, ...withoutUsages } = LIVE;
    const usage = parseKimiUsage(withoutUsages);
    expect(usage.windows.map((window) => window.key)).toEqual(["w7d", "w5h"]);
    expect(usage.windows.every((window) => window.usedPercent === 0)).toBe(true);
  });

  it("derives a percentage from remaining when used is missing", () => {
    const usage = parseKimiUsage({
      usage: { limit: "100", remaining: "86.58" },
      limits: [],
    });
    expect(usage.windows[0]?.usedPercent).toBeCloseTo(13.42, 6);
  });

  it("reports plan and parallel limit without exposing tokens", () => {
    const usage = parseKimiUsage({ ...LIVE, user: { membership: { level: "LEVEL_ADVANCED" } }, parallel: { limit: "30" } });
    expect(usage.plan).toBe("ADVANCED");
    expect(usage.parallelLimit).toBe(30);
    expect(JSON.stringify(usage)).not.toMatch(/Bearer|access_token/u);
  });

  it("rejects a malformed response", () => {
    expect(() => parseKimiUsage("nope")).toThrow(/malformed/u);
  });
});
