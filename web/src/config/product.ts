export const productConfig = {
    name: "S1API Studio",
    shortName: "S1 Studio",
    assistantName: "S1 Studio AI",
    description: "提示词、参考素材与生成结果一体化的视觉创作工作台。",
    websiteUrl: "https://s1api.com",
    apiKeyUrl: "https://s1api.com/keys",
    defaultApiBaseUrl: "https://s1api.com/v1",
    guestWorkspace: String(import.meta.env.VITE_CANVAS_AUTH_MODE || "").toLowerCase() === "guest",
    generatedMediaRemoteOnly: String(import.meta.env.VITE_CANVAS_GENERATED_MEDIA_MODE || "").toLowerCase() === "remote_only",
    unsupportedDefaultCapabilities: ["video", "audio"] as const,
};
