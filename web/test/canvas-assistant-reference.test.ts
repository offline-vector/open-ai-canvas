import { describe, expect, test } from "bun:test";

import { directCanvasAssistantImageUrl } from "../src/lib/canvas/canvas-assistant-reference";

describe("canvas assistant image references", () => {
    test("passes remote generated media URLs directly to the multimodal model", () => {
        expect(directCanvasAssistantImageUrl({ dataUrl: "https://cdn.example.com/generated.png" })).toBe("https://cdn.example.com/generated.png");
    });

    test("keeps stored resources on the authenticated blob conversion path", () => {
        expect(directCanvasAssistantImageUrl({ dataUrl: "https://studio.example.com/api/resources/asset/file", storageKey: "resource:asset" })).toBe("");
    });

    test("does not pass non-HTTPS references directly", () => {
        expect(directCanvasAssistantImageUrl({ dataUrl: "http://example.com/generated.png" })).toBe("");
        expect(directCanvasAssistantImageUrl({ dataUrl: "data:image/png;base64,AAAA" })).toBe("");
    });
});
