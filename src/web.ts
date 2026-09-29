import type { IncomingMessage, ServerResponse } from "node:http";
import type { Context } from "@deepseek-ai/cordis";
import { KIMI_CODE_OAUTH_LOGIN_CANCEL_PATH, KIMI_CODE_OAUTH_LOGIN_PATH, KIMI_CODE_OAUTH_LOGOUT_PATH, KIMI_CODE_OAUTH_MODELS_PATH, KIMI_CODE_OAUTH_STATUS_PATH, KIMI_CODE_OAUTH_USAGE_PATH } from "./web-ids.ts";
import { createKimiUsageReader } from "./usage.ts";
import type { OAuthProviderSession } from "./oauth-session.ts";

function send(res: ServerResponse, status: number, value: unknown): void { const body = JSON.stringify(value); res.statusCode = status; res.setHeader("content-type", "application/json; charset=utf-8"); res.end(body); }
async function body(req: IncomingMessage): Promise<Record<string, unknown>> { let text = ""; for await (const chunk of req) text += String(chunk); if (!text) return {}; const value = JSON.parse(text); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export function registerKimiRoutes(ctx: Context, session: OAuthProviderSession): void {
  let challenge: { url: string; userCode?: string } | undefined;
  let operation: Promise<void> | undefined;
  let cancellation: AbortController | undefined;
  let error: string | undefined;
  const usage = createKimiUsageReader(session);
  const status = async () => ({ provider: "kimi", route: session.definition.route, displayName: session.definition.displayName, authenticated: (await session.status()).authenticated, expiresAt: (await session.status()).expiresAt, signingIn: operation !== undefined, challenge, error, models: session.visibleModels().map((m) => ({ id: m.id, name: m.name })), selected: session.selectedModelIds() });
  const webServer = ctx.get("webServer") as { register(route: { kind: "exact"; path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> }): () => void };
  const register = (path: string, method: string, handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>) => webServer.register({ kind: "exact", path, handler: async (req: IncomingMessage, res: ServerResponse) => { if (req.method !== method) return send(res, 405, { error: "method not allowed" }); try { await handler(req, res); } catch (e) { send(res, 500, { error: e instanceof Error ? e.message : String(e) }); } } });
  ctx.effect(() => {
    const releases = [
      register(KIMI_CODE_OAUTH_STATUS_PATH, "GET", async (_req, res) => send(res, 200, await status())),
      register(KIMI_CODE_OAUTH_USAGE_PATH, "GET", async (_req, res) => { try { send(res, 200, await usage.read(false)); } catch (e) { send(res, 200, { error: e instanceof Error ? e.message : String(e) }); } }),
      register(KIMI_CODE_OAUTH_LOGIN_PATH, "POST", async (_req, res) => { if (operation) return send(res, 409, { error: "login already in progress" }); challenge = undefined; error = undefined; cancellation = new AbortController(); operation = session.login({ signal: AbortSignal.any([cancellation.signal, AbortSignal.timeout(10 * 60 * 1000)]), prompt: async (prompt) => prompt.type === "select" ? "device" : Promise.reject(new Error(prompt.message)), notify: (event) => { if (event.type === "device_code") challenge = { url: event.verificationUri, userCode: event.userCode }; else if (event.type === "auth_url") challenge = { url: event.url }; } }).then(() => undefined).catch((e) => { error = e instanceof Error ? e.message : String(e); }).finally(() => { operation = undefined; cancellation = undefined; }); send(res, 202, await status()); }),
      register(KIMI_CODE_OAUTH_LOGIN_CANCEL_PATH, "POST", async (_req, res) => { cancellation?.abort(); await operation?.catch(() => undefined); send(res, 200, await status()); }),
      register(KIMI_CODE_OAUTH_LOGOUT_PATH, "POST", async (_req, res) => { await session.logout(); usage.clear(); send(res, 200, await status()); }),
      register(KIMI_CODE_OAUTH_MODELS_PATH, "POST", async (req, res) => { const value = await body(req); const selected = value.selected; if (!Array.isArray(selected) || selected.some((id) => typeof id !== "string")) return send(res, 400, { error: "selected must be an array" }); await session.setSelectedModels(value.selectionMode === "default" ? undefined : selected as string[]); send(res, 200, await status()); })
    ];
    return () => releases.forEach((release) => release());
  }, "dsh-kimi-code-oauth: web routes");
}
