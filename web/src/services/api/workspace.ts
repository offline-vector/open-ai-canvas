import { apiClient, request } from "@/services/api/request";

let bootstrapPromise: Promise<{ ready: boolean }> | null = null;

export function bootstrapBrowserWorkspace() {
    if (!bootstrapPromise) {
        bootstrapPromise = request<{ ready: boolean }>(apiClient.get("/workspace/bootstrap")).catch((error) => {
            bootstrapPromise = null;
            throw error;
        });
    }
    return bootstrapPromise;
}
