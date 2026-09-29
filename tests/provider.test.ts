import { describe, expect, it } from "vitest";
import { KIMI_CODE_OAUTH_PROVIDER, OAUTH_PROVIDER_DEFINITIONS } from "../src/oauth-providers.ts";

describe("Kimi Code provider", () => {
  it("declares only Kimi Code", () => {
    expect(OAUTH_PROVIDER_DEFINITIONS).toHaveLength(1);
    expect(KIMI_CODE_OAUTH_PROVIDER.route).toBe("kimi-code-oauth");
    expect(KIMI_CODE_OAUTH_PROVIDER.loginMethods).toEqual(["device"]);
  });

  it("uses Bearer authentication", async () => {
    const provider = KIMI_CODE_OAUTH_PROVIDER.requestProvider();
    const auth = await provider.auth.apiKey?.resolve({ ctx: {} as never, signal: new AbortController().signal, credential: { type: "api-key", key: "token" } as never });
    expect(auth).toEqual({ auth: { headers: { Authorization: "Bearer token" } }, source: "OAuth bridge" });
  });
});
