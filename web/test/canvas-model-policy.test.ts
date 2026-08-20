import { describe, expect, test } from "bun:test";

import { assertCanvasImageReferenceLimit, canvasImageReferenceLimitError } from "../src/lib/canvas/canvas-project-generation";
import { defaultConfig } from "../src/stores/use-config-store";

describe("画布图片参考图上限", () => {
    test("超限时不丢弃输入并返回可操作提示", () => {
        const config = structuredClone(defaultConfig);
        const channel = config.channels[0];
        if (!channel) throw new Error("缺少默认渠道");
        channel.modelCosts = [
            {
                model: "gpt-image-2",
                capability: "image",
                capabilityConfig: {
                    version: 1,
                    image: {
                        references: { promptMaxChars: 32000, maxImages: 1, maxImageBytes: 1000, maskSupported: true },
                        size: { parameter: "size", values: ["1:1"], default: "1:1", allowCustom: true },
                        quality: { supported: true, values: ["auto"], default: "auto" },
                        transparentBackground: { supported: false, default: false },
                        responseFormat: { supported: true },
                        outputFormat: { supported: true },
                        maxOutputs: 1,
                    },
                },
            },
        ];
        const references = [
            { id: "a", name: "a.png", type: "image/png", dataUrl: "data:image/png;base64,YQ==" },
            { id: "b", name: "b.png", type: "image/png", dataUrl: "data:image/png;base64,Yg==" },
        ];

        expect(canvasImageReferenceLimitError(config, references)).toContain("最多支持 1 张参考图，当前已连接 2 张");
        expect(() => assertCanvasImageReferenceLimit(config, references)).toThrow("请移除多余连线后重试");
        expect(references).toHaveLength(2);
    });
});
