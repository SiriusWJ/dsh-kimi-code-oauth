import type { GenerateOptions, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, ResolvedRetryPolicy, StreamChunk } from "@deepseek-ai/dsh-llm";
import { LlmAdapter } from "@deepseek-ai/dsh-llm";
export interface AliasLlmRoutePolicy {
    displayName?: string;
    isAuthenticated?: () => Promise<boolean>;
    includeModel?: (id: string) => boolean;
    onAuthFailure?: () => Promise<void>;
}
export declare function normalizeReplayForRoute(message: GenerateOptions["messages"][number], route: string, native: string): GenerateOptions["messages"][number];
export declare class AliasLlmAdapter extends LlmAdapter {
    private readonly inner;
    private readonly aliases;
    private readonly policies;
    constructor(inner: LlmAdapter, aliases: ReadonlyMap<string, string>, policies?: Map<string, AliasLlmRoutePolicy>);
    private native;
    providerInfo(provider: string): LlmProviderInfo;
    providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
