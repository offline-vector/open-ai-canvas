import { productConfig } from "@/config/product";

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
