export type CanvasAssistantImageReference = {
    dataUrl?: string;
    url?: string;
    storageKey?: string;
};

export function directCanvasAssistantImageUrl(reference: CanvasAssistantImageReference) {
    if (reference.storageKey) return "";
    const url = reference.dataUrl || reference.url || "";
    return /^https:\/\//i.test(url) ? url : "";
}
