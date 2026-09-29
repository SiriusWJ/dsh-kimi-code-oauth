import { KIMI_CODE_OAUTH_ROUTE, KIMI_PI_PROVIDER } from "./ids.js";
import { createKimiCodeAdapter } from "./adapter.js";
import { OAUTH_PROVIDER_DEFINITIONS } from "./oauth-providers.js";
import { OAuthProviderSession } from "./oauth-session.js";
import { registerKimiRoutes } from "./web.js";
export const name = "dsh-kimi-code-oauth";
export const inject = ["webServer", "llm"];
export { KIMI_CODE_OAUTH_PROVIDER, OAUTH_PROVIDER_DEFINITIONS } from "./oauth-providers.js";
export { KIMI_CODE_OAUTH_ROUTE, KIMI_PI_PROVIDER } from "./ids.js";
export { OAuthProviderSession } from "./oauth-session.js";
export { KimiCodeCredentialStore, kimiCodeAuthPath } from "./store.js";
export function apply(ctx, _config = {}) {
    ctx.inject(["webServer"], (webCtx) => {
        const session = new OAuthProviderSession(OAUTH_PROVIDER_DEFINITIONS[0]);
        void session.loadCachedModels().catch(() => undefined);
        registerKimiRoutes(webCtx, session);
        webCtx.inject(["llm"], (llmCtx) => {
            const session = new OAuthProviderSession(OAUTH_PROVIDER_DEFINITIONS[0]);
            void session.loadCachedModels().catch(() => undefined);
            const registration = llmCtx.llm.registerAdapter([KIMI_CODE_OAUTH_ROUTE], createKimiCodeAdapter(session, () => llmCtx.get("attachments")));
            llmCtx.effect(() => registration, "dsh-kimi-code-oauth: LLM adapter");
        });
    });
}
