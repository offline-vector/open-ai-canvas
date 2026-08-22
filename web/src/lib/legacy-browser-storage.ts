import localforage from "localforage";

import { scopedStorageKey } from "@/lib/user-scope";
import { CANVAS_STORE_KEY } from "@/stores/canvas/use-canvas-store";
import { ASSET_STORE_KEY } from "@/stores/use-asset-store";
import { CONFIG_STORE_KEY } from "@/stores/use-config-store";

const LEGACY_CONFIG_STORE_KEY = "infinite-canvas:ai_config_store";

type AsyncStorage = {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
};

type SyncStorage = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
};

export async function copyMissingLegacyEntry(storage: AsyncStorage, sourceKey: string, targetKey: string) {
    if (await storage.getItem(targetKey)) return false;
    const source = await storage.getItem(sourceKey);
    if (!source) return false;
    await storage.setItem(targetKey, source);
    return true;
}

export function copyMissingLegacySyncEntry(storage: SyncStorage, sourceKey: string, targetKey: string) {
    if (storage.getItem(targetKey)) return false;
    const source = storage.getItem(sourceKey);
    if (!source) return false;
    storage.setItem(targetKey, source);
    return true;
}

// Copy legacy and pre-v1.1 anonymous indexes without deleting rollback data.
export async function migrateLegacyBrowserStorage() {
    if (typeof window === "undefined") return { canvas: false, assets: false, config: false };
    const appState = localforage.createInstance({ name: "infinite-canvas", storeName: "app_state" });
    const storage: AsyncStorage = {
        getItem: async (key) => (await appState.getItem<string>(key)) || window.localStorage.getItem(key),
        setItem: async (key, value) => {
            try {
                await appState.setItem(key, value);
            } catch {
                window.localStorage.setItem(key, value);
            }
        },
    };
    const [canvas, assets] = await Promise.all([copyMissingLegacyEntry(storage, CANVAS_STORE_KEY, scopedStorageKey(CANVAS_STORE_KEY)), copyMissingLegacyEntry(storage, ASSET_STORE_KEY, scopedStorageKey(ASSET_STORE_KEY))]);
    const config = copyMissingLegacySyncEntry(window.localStorage, LEGACY_CONFIG_STORE_KEY, scopedStorageKey(CONFIG_STORE_KEY));
    return { canvas, assets, config };
}
