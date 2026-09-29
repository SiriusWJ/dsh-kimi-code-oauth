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
export declare const KIMI_USAGE_URL = "https://api.kimi.com/coding/v1/usages";
export declare function parseKimiUsage(raw: unknown, now?: number): KimiUsage;
export interface KimiUsageReader {
    read(force?: boolean): Promise<KimiUsage>;
    clear(): void;
}
export declare function createKimiUsageReader(session: OAuthProviderSession, ttlMs?: number): KimiUsageReader;
