import type { Api, ApiKeyAuth, Provider } from "@earendil-works/pi-ai";
import { kimiCodingProvider } from "@earendil-works/pi-ai/providers/kimi-coding";
import { KIMI_CODE_OAUTH_AUTH_FILENAME, KIMI_CODE_OAUTH_MODELS_CACHE_FILENAME, KIMI_CODE_OAUTH_ROUTE, KIMI_PI_PROVIDER } from "./ids.ts";

export type SubscriptionProviderSlug = "kimi";
export type SubscriptionLoginMethod = "device";
export interface OAuthProviderDefinition {
  slug: SubscriptionProviderSlug;
  route: string;
  nativeProviderId: string;
  displayName: string;
  authFilename: string;
  modelsCacheFilename: string;
  loginMethods: readonly SubscriptionLoginMethod[];
  recommendedLoginMethod: SubscriptionLoginMethod;
  providerFactory(): Provider<Api>;
  requestProvider(selectedIds?: readonly string[]): Provider<Api>;
}
function requestTokenAuth(): ApiKeyAuth {
  return { name: "Kimi Code OAuth token", resolve: async ({ credential }) => {
    const token = credential?.key?.trim();
    return token ? { auth: { headers: { Authorization: `Bearer ${token}` } }, source: "OAuth bridge" } : undefined;
  } };
}
function withoutApiKey<T extends { apiKey?: unknown }>(options: T): T { const { apiKey: _dropped, ...rest } = options; return rest as T; }
function kimiProvider(): Provider<Api> {
  const base = kimiCodingProvider() as Provider<Api>;
  return { ...base, auth: { ...base.auth, apiKey: requestTokenAuth() }, stream: (m, c, o) => base.stream(m, c, o === undefined ? undefined : withoutApiKey(o)), streamSimple: (m, c, o) => base.streamSimple(m, c, o === undefined ? undefined : withoutApiKey(o)) };
}
export const KIMI_CODE_OAUTH_PROVIDER: OAuthProviderDefinition = {
  slug: "kimi", route: KIMI_CODE_OAUTH_ROUTE, nativeProviderId: KIMI_PI_PROVIDER,
  displayName: "Kimi Code (subscription)", authFilename: KIMI_CODE_OAUTH_AUTH_FILENAME,
  modelsCacheFilename: KIMI_CODE_OAUTH_MODELS_CACHE_FILENAME, loginMethods: ["device"], recommendedLoginMethod: "device",
  providerFactory: kimiProvider, requestProvider: (selectedIds) => {
    const provider = kimiProvider(); const selected = selectedIds === undefined ? undefined : new Set(selectedIds);
    return { ...provider, getModels: () => { const models = provider.getModels(); return selected === undefined ? models : models.filter((m) => selected.has(m.id)); } };
  },
};
export const OAUTH_PROVIDER_DEFINITIONS = [KIMI_CODE_OAUTH_PROVIDER] as const;
export function oauthProviderDefinition(slug: string): OAuthProviderDefinition | undefined { return OAUTH_PROVIDER_DEFINITIONS.find((p) => p.slug === slug); }
