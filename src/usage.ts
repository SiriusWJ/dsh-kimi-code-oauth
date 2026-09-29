import type { OAuthProviderSession } from "./oauth-session.ts";

/**
 * Kimi Code Coding Plan quota, read from the endpoint the Code product itself
 * uses. The live payload (verified 2026-09) carries two shapes:
 *
 *   { usage:  { limit, remaining, resetTime },
 *     limits: [{ window: { duration, timeUnit }, detail: { limit, remaining, resetTime } }],
 *     usages: { limit_5h: { used_ratio, reset_time }, limit_7d: { used_ratio, reset_time } } }
 *
 * `usages` is the exact projection the Kimi usage page renders (5-hour and
 * 7-day rows), so it wins when present; `usage`/`limits` are the fallback for
 * responses that omit it. Note that `used` is absent upstream — the percentage
 * is derived from `remaining` (or read from `used_ratio`).
 */
export interface KimiQuotaWindow {
  /** Canonical window key (`w5h`, `w7d`, …) so the client can localize it. */
  key: string;
  /** Reset instant reported by Kimi, as an ISO/epoch string. */
  resetAt?: string;
  usedPercent: number;
  remainingPercent: number;
}

export interface KimiUsage {
  fetchedAt: number;
  plan?: string;
  windows: KimiQuotaWindow[];
  parallelLimit?: number;
}

export const KIMI_USAGE_URL = "https://api.kimi.com/coding/v1/usages";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finite(value: unknown): number | undefined {
  const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** `used_ratio` is a 0..1 ratio; a value above 1 is already a percentage. */
function ratioPercent(value: unknown): number | undefined {
  const ratio = finite(value);
  if (ratio === undefined || ratio < 0) return undefined;
  return clampPercent(ratio > 1 ? ratio : ratio * 100);
}

/** Derive used percent from either `used`/`limit` or `remaining`/`limit`. */
function countsPercent(detail: unknown): number | undefined {
  if (!record(detail)) return undefined;
  const limit = finite(detail.limit) ?? finite(detail.total);
  if (limit === undefined || limit <= 0) return undefined;
  const used = finite(detail.used);
  if (used !== undefined) return clampPercent((used / limit) * 100);
  const remaining = finite(detail.remaining);
  if (remaining !== undefined) return clampPercent(((limit - remaining) / limit) * 100);
  return undefined;
}

function isoString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value;
  const epoch = finite(value);
  if (epoch === undefined || epoch <= 0) return undefined;
  return new Date(epoch < 1e12 ? epoch * 1000 : epoch).toISOString();
}

/** Map a rolling window to the same canonical keys the `usages` shape uses. */
function windowKey(window: unknown): string {
  if (!record(window)) return "wWindow";
  const duration = finite(window.duration);
  const unit = String(window.timeUnit ?? "").toUpperCase();
  if (duration === undefined || duration <= 0) return "wWindow";
  const seconds = unit.includes("MINUTE")
    ? duration * 60
    : unit.includes("HOUR")
      ? duration * 3600
      : unit.includes("DAY")
        ? duration * 86400
        : duration;
  if (seconds === 18_000) return "w5h";
  if (seconds === 604_800) return "w7d";
  if (seconds === 86_400) return "w1d";
  if (seconds % 86_400 === 0) return `w${seconds / 86_400}d`;
  if (seconds % 3600 === 0) return `w${seconds / 3600}h`;
  return `w${seconds}s`;
}

export function parseKimiUsage(raw: unknown, now: number = Date.now()): KimiUsage {
  if (!record(raw)) throw new Error("Kimi returned a malformed usage response");
  const windows: KimiQuotaWindow[] = [];
  const add = (key: string, usedPercent: number | undefined, resetAt: string | undefined): void => {
    if (usedPercent === undefined) return;
    if (windows.some((window) => window.key === key)) return;
    windows.push({
      key,
      usedPercent,
      remainingPercent: clampPercent(100 - usedPercent),
      ...(resetAt === undefined ? {} : { resetAt }),
    });
  };

  const usages = record(raw.usages) ? raw.usages : undefined;
  if (usages !== undefined) {
    for (const [name, key] of [
      ["limit_5h", "w5h"],
      ["limit_7d", "w7d"],
    ] as const) {
      const entry = record(usages[name]) ? usages[name] : undefined;
      if (entry === undefined) continue;
      add(key, ratioPercent(entry.used_ratio), isoString(entry.reset_time));
    }
  }

  // Fallback shapes: only consulted when `usages` produced nothing, so a
  // response carrying both never renders the same window twice.
  if (windows.length === 0) {
    if (record(raw.usage)) add("w7d", countsPercent(raw.usage), isoString(raw.usage.resetTime));
    for (const entry of Array.isArray(raw.limits) ? raw.limits : []) {
      if (!record(entry)) continue;
      add(windowKey(entry.window), countsPercent(entry.detail), isoString(record(entry.detail) ? entry.detail.resetTime : undefined));
    }
  }

  const parallel = record(raw.parallel) ? finite(raw.parallel.limit) : undefined;
  const membership = record(raw.user) && record(raw.user.membership) ? raw.user.membership.level : undefined;
  return {
    fetchedAt: now,
    windows,
    ...(typeof membership === "string" && membership.length > 0
      ? { plan: membership.replace(/^LEVEL_/u, "").replaceAll("_", " ") }
      : {}),
    ...(parallel !== undefined && parallel > 0 ? { parallelLimit: parallel } : {}),
  };
}

export interface KimiUsageReader {
  read(force?: boolean): Promise<KimiUsage>;
  clear(): void;
}

export function createKimiUsageReader(session: OAuthProviderSession, ttlMs = 60_000): KimiUsageReader {
  let cached: KimiUsage | undefined;
  let cachedAt = 0;
  let inFlight: Promise<KimiUsage> | undefined;
  return {
    async read(force = false): Promise<KimiUsage> {
      if (!force && cached !== undefined && Date.now() - cachedAt < ttlMs) return structuredClone(cached);
      if (inFlight !== undefined) return inFlight;
      const current = (async () => {
        const token = await session.resolveAccessToken();
        if (token === undefined || token.length === 0) throw new Error("Kimi Code is not signed in");
        const response = await fetch(KIMI_USAGE_URL, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "cache-control": "no-store" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`Kimi usage request failed (HTTP ${response.status})`);
        const value = parseKimiUsage(await response.json());
        cached = value;
        cachedAt = Date.now();
        return structuredClone(value);
      })().finally(() => {
        if (inFlight === current) inFlight = undefined;
      });
      inFlight = current;
      return current;
    },
    clear(): void {
      cached = undefined;
      cachedAt = 0;
    },
  };
}
