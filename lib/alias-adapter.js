import { LlmAdapter, LlmError } from "@deepseek-ai/dsh-llm";
function remapAuthFailureIfContextOverflow(failure) { return failure; }
export function normalizeReplayForRoute(message, route, native) { if (message.role !== "assistant" || message.source.kind !== "model")
    return message; if (message.source.provider !== route) {
    if (message.source.replayState === undefined)
        return message;
    const { replayState: _drop, ...source } = message.source;
    return { ...message, source };
} return { ...message, source: { ...message.source, provider: native } }; }
export class AliasLlmAdapter extends LlmAdapter {
    inner;
    aliases;
    policies;
    constructor(inner, aliases, policies = new Map()) {
        super();
        this.inner = inner;
        this.aliases = aliases;
        this.policies = policies;
    }
    native(route) { const p = this.aliases.get(route); if (!p)
        throw new LlmError(`Kimi adapter does not own provider "${route}"`, "NO_ADAPTER"); return p; }
    providerInfo(provider) { const route = provider; const info = this.inner.providerInfo(this.native(route)); const name = this.policies.get(route)?.displayName; return { ...info, id: route, ...(name ? { name } : {}) }; }
    providerRetryPolicy(provider) { return this.inner.providerRetryPolicy(this.native(provider)); }
    async listModels(provider) { const listed = (await this.inner.listModels(this.native(provider))).map((m) => ({ ...m, provider })); const p = this.policies.get(provider); if (p?.isAuthenticated && !(await p.isAuthenticated().catch(() => false)))
        return []; return p?.includeModel ? listed.filter((m) => p.includeModel?.(m.id)) : listed; }
    async resolveModel(provider, model, signal) { return { ...(await this.inner.resolveModel(this.native(provider), model, signal)), provider }; }
    async *stream(options) { const route = options.provider; let notified = false; for await (const raw of this.inner.stream({ ...options, provider: this.native(route), messages: options.messages.map((m) => normalizeReplayForRoute(m, route, this.native(route))) })) {
        const chunk = raw.type === "finish" && raw.reason.kind === "error" ? { ...raw, reason: { ...raw.reason, failure: remapAuthFailureIfContextOverflow(raw.reason.failure) } } : raw;
        if (!notified && chunk.type === "finish" && chunk.reason.kind === "error" && chunk.reason.failure.code === "AUTH") {
            notified = true;
            await this.policies.get(route)?.onAuthFailure?.().catch(() => undefined);
        }
        yield chunk;
    } }
}
