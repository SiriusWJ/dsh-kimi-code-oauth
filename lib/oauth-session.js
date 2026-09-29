/**
 * Persistent OAuth session and static model selection for one subscription provider.
 * @module dsh-coding-subscription-oauth/oauth-session
 */
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { createModels } from "@earendil-works/pi-ai";
import { ModelCacheQueue, writeModelCache } from "./model-cache.js";
import { OAuthCredentialFileStore, oauthCredentialPath } from "./store.js";
const MODELS_CACHE_VERSION = 2;
function isENOENT(error) {
    return error?.code === "ENOENT";
}
function parseIdList(value) {
    if (!Array.isArray(value))
        return [];
    return [...new Set(value.filter((id) => typeof id === "string" && id.length > 0))];
}
function parseCache(text) {
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        return undefined;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return undefined;
    const document = value;
    if (document["version"] !== 1 && document["version"] !== MODELS_CACHE_VERSION)
        return undefined;
    const selected = parseIdList(document["selected"]);
    if (document["version"] === MODELS_CACHE_VERSION)
        return document["selectionMode"] === "selected" ? selected : undefined;
    return selected.length === 0 ? undefined : selected;
}
export function oauthModelsCachePath(basename, dshHome) {
    return resolve(join(resolveDshHome(dshHome), basename));
}
export class OAuthProviderSession {
    definition;
    store;
    models;
    catalog;
    cacheFile;
    selectedIds;
    cacheQueue = new ModelCacheQueue();
    constructor(definition, onCatalogChange, store = new OAuthCredentialFileStore(definition.nativeProviderId, oauthCredentialPath(definition.authFilename), definition.route), cacheFile = oauthModelsCachePath(definition.modelsCacheFilename)) {
        this.definition = definition;
        this.store = store;
        this.cacheFile = resolve(cacheFile);
        const provider = definition.providerFactory();
        this.catalog = [...provider.getModels()];
        this.models = createModels({ credentials: store });
        this.models.setProvider(provider);
        this.onCatalogChange = onCatalogChange;
    }
    onCatalogChange;
    availableModels() {
        return [...this.catalog];
    }
    selectedModelIds() {
        return this.selectedIds === undefined ? undefined : [...this.selectedIds];
    }
    visibleModels() {
        if (this.selectedIds === undefined)
            return this.availableModels();
        const byId = new Map(this.catalog.map((model) => [model.id, model]));
        return this.selectedIds.flatMap((id) => {
            const model = byId.get(id);
            return model === undefined ? [] : [model];
        });
    }
    provider() {
        return this.definition.requestProvider(this.visibleModels().map((model) => model.id));
    }
    async loadCachedModels() {
        try {
            this.selectedIds = parseCache(await readFile(this.cacheFile, "utf8"));
        }
        catch (error) {
            if (!isENOENT(error))
                throw error;
        }
    }
    async setSelectedModels(ids) {
        const selected = ids === undefined ? undefined : [...new Set(ids.filter((id) => id.length > 0))];
        await this.cacheQueue.run(async () => {
            await this.writeCache(selected);
            this.selectedIds = selected;
            this.onCatalogChange?.();
        });
    }
    async status() {
        const credential = await this.store.read(this.definition.nativeProviderId);
        if (credential?.type !== "oauth")
            return { authenticated: false };
        return { authenticated: true, expiresAt: credential.expires };
    }
    async login(interaction, persist = { mode: "add" }) {
        const credential = await this.store.runLoginPersist(persist, () => this.models.login(this.definition.nativeProviderId, "oauth", interaction));
        this.onCatalogChange?.();
        return credential;
    }
    async resolveAccessToken() {
        const resolved = await this.models.getAuth(this.definition.nativeProviderId);
        if (resolved === undefined)
            return undefined;
        const credential = await this.store.read(this.definition.nativeProviderId);
        return credential?.type === "oauth" ? credential.access : undefined;
    }
    /**
     * Backdate the stored token's expiry so the next `getAuth()` refreshes.
     * Called after an upstream 401 rejected a locally-valid token.
     */
    async invalidateAccessToken() {
        await this.store.invalidate(this.definition.nativeProviderId);
    }
    /** Refresh host discovery after an account switch/remove without a full logout. */
    notifyCredentialChange() {
        this.onCatalogChange?.();
    }
    async storedCredential() {
        const credential = await this.store.read(this.definition.nativeProviderId);
        return credential?.type === "oauth" ? credential : undefined;
    }
    async logout() {
        return this.cacheQueue.run(async () => {
            try {
                await this.models.logout(this.definition.nativeProviderId);
                this.selectedIds = undefined;
                await mkdir(dirname(this.cacheFile), { recursive: true, mode: 0o700 });
                await rm(this.cacheFile, { force: true });
            }
            finally {
                // Credential deletion may succeed before cache cleanup fails. Always
                // refresh discovery so an open selector cannot retain stale models.
                this.onCatalogChange?.();
            }
        });
    }
    async writeCache(selected) {
        const document = {
            version: MODELS_CACHE_VERSION,
            selected: selected === undefined ? [] : [...selected],
            selectionMode: selected === undefined ? "default" : "selected",
        };
        await writeModelCache(this.cacheFile, document);
    }
}
