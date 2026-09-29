import { LlmAdapter, LlmError, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { KIMI_CODE_OAUTH_ROUTE, KIMI_PI_PROVIDER } from "./ids.ts";
import { AliasLlmAdapter } from "./alias-adapter.ts";
import type { OAuthProviderSession } from "./oauth-session.ts";
import { safeMessage } from "./redact.ts";
const POLICY = { mode: "normal" as const, maxRetries: 3, retryableCodes: ["EMPTY_RESPONSE", "RATE_LIMIT", "SERVER", "TIMEOUT", "TRANSPORT", "AUTH"], backoff: { initialDelayMs: 1000, maxDelayMs: 10000, jitterRatio: 0.1 } };
async function token(session: OAuthProviderSession): Promise<string> { try { const value = await session.resolveAccessToken(); if (!value) throw new Error("not signed in"); return value; } catch (e) { throw new LlmError(`Kimi Code could not refresh its sign-in (${safeMessage(e)}). Open Settings and sign in again.`, "MISSING_CREDENTIAL"); } }
export function createKimiCodeAdapter(session: OAuthProviderSession, resolveAttachments: () => unknown): LlmAdapter {
  const inner = new PiAiAdapter({ profiles: () => new Map([[KIMI_PI_PROVIDER, { provider: KIMI_PI_PROVIDER, displayName: session.definition.displayName, streamIdleTimeoutMs: 120000, retryPolicy: resolveRetryPolicy(POLICY, "dsh-kimi-code-oauth"), configuredMaxTokens: new Map(), modelErrors: new Map(), piProvider: session.provider() as any }]]), resolveApiKey: () => token(session), resolveAttachments } as any) as LlmAdapter;
  return new AliasLlmAdapter(inner, new Map([[KIMI_CODE_OAUTH_ROUTE, KIMI_PI_PROVIDER]]), new Map([[KIMI_CODE_OAUTH_ROUTE, { displayName: "Kimi Code (OAuth)", isAuthenticated: async () => (await session.status()).authenticated, onAuthFailure: () => session.invalidateAccessToken() }]]));
}
