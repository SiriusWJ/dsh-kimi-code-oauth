let cached;
let cachedAt = 0;
let inFlight;
function record(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function percent(value) { if (!record(value))
    return undefined; const limit = Number(value.limit); const used = Number(value.used); if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(used))
    return undefined; return Math.max(0, Math.min(100, used / limit * 100)); }
function label(window) { const value = record(window) ? Number(window.duration) : 0; const unit = record(window) ? String(window.timeUnit ?? "") : ""; if (unit.includes("MINUTE"))
    return value % 60 === 0 ? `${value / 60}-hour` : `${value}-minute`; if (unit.includes("HOUR"))
    return `${value}-hour`; if (unit.includes("DAY"))
    return `${value}-day`; return "Rolling window"; }
function parse(raw) { if (!record(raw))
    throw new Error("Kimi returned malformed usage response"); const windows = []; const weekly = percent(raw.usage); if (weekly !== undefined)
    windows.push({ label: "Weekly", usedPercent: weekly, remainingPercent: 100 - weekly, ...(record(raw.usage) && typeof raw.usage.resetTime === "string" ? { resetAt: raw.usage.resetTime } : {}) }); if (Array.isArray(raw.limits))
    for (const entry of raw.limits) {
        if (!record(entry))
            continue;
        const detail = entry.detail;
        const used = percent(detail);
        if (used === undefined)
            continue;
        windows.push({ label: label(entry.window), usedPercent: used, remainingPercent: 100 - used, ...(record(detail) && typeof detail.resetTime === "string" ? { resetAt: detail.resetTime } : {}) });
    } const parallel = record(raw.parallel) ? Number(raw.parallel.limit) : NaN; const membership = record(raw.user) && record(raw.user.membership) ? raw.user.membership.level : undefined; return { fetchedAt: Date.now(), windows, ...(typeof membership === "string" ? { plan: membership.replace(/^LEVEL_/u, "").replaceAll("_", " ") } : {}), ...(Number.isFinite(parallel) && parallel > 0 ? { parallelLimit: parallel } : {}) }; }
export function createKimiUsageReader(session) { return { async read(force = false) { if (!force && cached && Date.now() - cachedAt < 60_000)
        return structuredClone(cached); if (inFlight)
        return inFlight; inFlight = (async () => { const token = await session.resolveAccessToken(); if (!token)
        throw new Error("Kimi Code is not signed in"); const response = await fetch("https://api.kimi.com/coding/v1/usages", { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "cache-control": "no-store" }, signal: AbortSignal.timeout(15_000) }); if (!response.ok)
        throw new Error(`Kimi usage request failed (HTTP ${response.status})`); const value = parse(await response.json()); cached = value; cachedAt = Date.now(); return structuredClone(value); })().finally(() => { inFlight = undefined; }); return inFlight; }, clear() { cached = undefined; cachedAt = 0; } }; }
