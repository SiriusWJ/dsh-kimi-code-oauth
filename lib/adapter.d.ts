import { LlmAdapter } from "@deepseek-ai/dsh-llm";
import type { OAuthProviderSession } from "./oauth-session.ts";
export declare function createKimiCodeAdapter(session: OAuthProviderSession, resolveAttachments: () => unknown): LlmAdapter;
