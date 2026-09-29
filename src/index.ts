import type { Context, Fiber } from "@deepseek-ai/cordis";
import type { AttachmentStore } from "@deepseek-ai/dsh-attachment";
import { KIMI_CODE_OAUTH_ROUTE, KIMI_PI_PROVIDER } from "./ids.ts";
import { createKimiCodeAdapter } from "./adapter.ts";
import { OAUTH_PROVIDER_DEFINITIONS } from "./oauth-providers.ts";
import { OAuthProviderSession } from "./oauth-session.ts";
import { registerKimiRoutes } from "./web.ts";

export const name = "dsh-kimi-code-oauth";
export const inject = ["webServer", "llm"] as const;
export { KIMI_CODE_OAUTH_PROVIDER, OAUTH_PROVIDER_DEFINITIONS } from "./oauth-providers.ts";
export { KIMI_CODE_OAUTH_ROUTE, KIMI_PI_PROVIDER } from "./ids.ts";
export { OAuthProviderSession } from "./oauth-session.ts";
export { KimiCodeCredentialStore, kimiCodeAuthPath } from "./store.ts";

export function apply(ctx: Context, _config: Record<string, never> = {}): void {
  ctx.inject(["webServer"], (webCtx) => {
    const session = new OAuthProviderSession(OAUTH_PROVIDER_DEFINITIONS[0]);
    void session.loadCachedModels().catch(() => undefined);
    registerKimiRoutes(webCtx, session);
    webCtx.inject(["llm"], (llmCtx) => {
    const session = new OAuthProviderSession(OAUTH_PROVIDER_DEFINITIONS[0]);
    void session.loadCachedModels().catch(() => undefined);
    const registration = llmCtx.llm.registerAdapter([KIMI_CODE_OAUTH_ROUTE], createKimiCodeAdapter(session, () => llmCtx.get("attachments") as AttachmentStore | undefined));
      llmCtx.effect(() => registration, "dsh-kimi-code-oauth: LLM adapter");
    });
  });
}
