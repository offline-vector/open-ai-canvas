import { productConfig } from "@/config/product";

export function usesBrowserImageStorage() {
    return productConfig.guestWorkspace || productConfig.generatedMediaRemoteOnly;
}

export function isBrowserStoredImageKey(key: string) {
    return usesBrowserImageStorage() && /^(image|generation-image):/.test(key);
}

export function isBrowserMediaUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && Boolean(url.hostname);
    } catch {
        return false;
    }
}

export function shouldKeepGeneratedMediaRemote(value: string, remoteOnly = productConfig.generatedMediaRemoteOnly) {
    return remoteOnly && isBrowserMediaUrl(value);
}
