import type { ReactNode } from "react";
import { useEffect } from "react";

import { DEFAULT_DRAWING_ENGINE } from "@/lib/canvas/canvas-drawing-engine";
import { localForageStorage } from "@/lib/localforage-storage";
import { scopedLocalStorage, setActiveUserScope } from "@/lib/user-scope";
import { CANVAS_STORE_KEY, useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { ASSET_STORE_KEY, useAssetStore } from "@/stores/use-asset-store";
import { CONFIG_STORE_KEY, defaultConfig, normalizeConfigSnapshot, useConfigStore } from "@/stores/use-config-store";
import { defaultFeatureAvailability, useUserStore } from "@/stores/use-user-store";

/** 初始化匿名浏览器工作区；不请求登录接口，也不把 API Key 送入身份系统。 */
export function GuestWorkspaceHydrator({ children }: { children: ReactNode }) {
    const hydrated = useUserStore((state) => state.hydrated);

    useEffect(() => {
        let cancelled = false;
        const hydrate = async () => {
            setActiveUserScope("guest");
            const [canvas, assets] = await Promise.all([localForageStorage.getItem(CANVAS_STORE_KEY), localForageStorage.getItem(ASSET_STORE_KEY)]);
            const config = scopedLocalStorage.getItem(CONFIG_STORE_KEY);
            if (cancelled) return;
            await Promise.all([useCanvasStore.persist.rehydrate(), useAssetStore.persist.rehydrate(), useConfigStore.persist.rehydrate()]);
            if (!canvas) useCanvasStore.setState({ projects: [] });
            if (!assets) useAssetStore.setState({ assets: [] });
            if (!config) useConfigStore.getState().replaceConfig(normalizeConfigSnapshot({ config: { ...defaultConfig } }).config);
            useUserStore.setState({ user: null, runtimeLimits: { activeTaskLimit: 5, resourceUploadMB: 50, sessionUploadMB: 32 }, drawingEngine: { defaultEngine: DEFAULT_DRAWING_ENGINE }, features: defaultFeatureAvailability, hydrated: true });
        };
        void hydrate();
        return () => {
            cancelled = true;
        };
    }, []);

    return hydrated ? children : null;
}
