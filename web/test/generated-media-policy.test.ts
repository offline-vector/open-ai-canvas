import { describe, expect, test } from "bun:test";

import { isBrowserMediaUrl, shouldKeepGeneratedMediaRemote } from "../src/lib/generated-media-policy";

describe("generated media remote-only policy", () => {
    test("keeps browser-renderable HTTPS results remote", () => {
        expect(isBrowserMediaUrl("https://media.example/result.png")).toBe(true);
        expect(shouldKeepGeneratedMediaRemote("https://media.example/result.png", true)).toBe(true);
    });

    test("does not treat inline, insecure, or malformed results as remote", () => {
        expect(shouldKeepGeneratedMediaRemote("data:image/png;base64,aGVsbG8=", true)).toBe(false);
        expect(shouldKeepGeneratedMediaRemote("http://media.example/result.png", true)).toBe(false);
        expect(shouldKeepGeneratedMediaRemote("not-a-url", true)).toBe(false);
        expect(shouldKeepGeneratedMediaRemote("https://media.example/result.png", false)).toBe(false);
    });
});
