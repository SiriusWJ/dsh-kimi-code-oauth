import type { Api, Provider } from "@earendil-works/pi-ai";
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
export declare const KIMI_CODE_OAUTH_PROVIDER: OAuthProviderDefinition;
export declare const OAUTH_PROVIDER_DEFINITIONS: readonly [OAuthProviderDefinition];
export declare function oauthProviderDefinition(slug: string): OAuthProviderDefinition | undefined;
