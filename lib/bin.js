import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { OAuthProviderSession } from "./oauth-session.js";
import { OAUTH_PROVIDER_DEFINITIONS } from "./oauth-providers.js";
async function main() { const action = process.argv[2] ?? "status"; const session = new OAuthProviderSession(OAUTH_PROVIDER_DEFINITIONS[0]); if (action === "status") {
    const status = await session.status();
    console.log(status.authenticated ? `Kimi Code: signed in${status.expiresAt ? `; expires ${new Date(status.expiresAt).toISOString()}` : ""}` : "Kimi Code: signed out");
    return;
} if (action === "logout") {
    await session.logout();
    console.log("Kimi Code: signed out");
    return;
} if (action === "login") {
    const rl = createInterface({ input, output });
    try {
        await session.login({ prompt: async (prompt) => rl.question(typeof prompt === "string" ? prompt : prompt.message), notify: (event) => console.log(event) });
    }
    finally {
        rl.close();
    }
    console.log("Kimi Code: signed in");
    return;
} throw new Error("usage: dsh-kimi-code login|logout|status"); }
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
