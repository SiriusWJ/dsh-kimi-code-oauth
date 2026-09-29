import type { OAuthProviderSession } from "./oauth-session.ts";
export interface KimiQuotaWindow {
    label: string;
    usedPercent: number;
    remainingPercent: number;
    resetAt?: string;
}
export interface KimiUsage {
    fetchedAt: number;
    plan?: string;
    windows: KimiQuotaWindow[];
    parallelLimit?: number;
}
export declare function createKimiUsageReader(session: OAuthProviderSession): {
    read(force?: boolean): Promise<KimiUsage>;
    clear(): void;
};
