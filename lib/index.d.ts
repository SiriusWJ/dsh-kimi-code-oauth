import type { Context } from "@deepseek-ai/cordis";
export declare const name = "dsh-kimi-code-oauth";
export declare const inject: readonly ["webServer", "llm"];
export { KIMI_CODE_OAUTH_PROVIDER, OAUTH_PROVIDER_DEFINITIONS } from "./oauth-providers.ts";
export { KIMI_CODE_OAUTH_ROUTE, KIMI_PI_PROVIDER } from "./ids.ts";
export { OAuthProviderSession } from "./oauth-session.ts";
export { KimiCodeCredentialStore, kimiCodeAuthPath } from "./store.ts";
export declare function apply(ctx: Context, _config?: Record<string, never>): void;
