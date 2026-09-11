import { describe, expect, test } from "bun:test";

import { buildNodeGenerationContext, hydrateNodeGenerationContext } from "../src/components/canvas/canvas-node-generation";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "../src/types/canvas";

function node(id: string, type: CanvasNodeType, content: string): CanvasNodeData {
    return {
        id,
        type,
        title: id,
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
        metadata: { content },
    };
}

function targetNode(): CanvasNodeData {
    return {
        id: "target",
        type: CanvasNodeType.Video,
        title: "target",
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
        metadata: { composerContent: "让 @图片1 进入画面" },
    };
}

function connection(fromNodeId: string): CanvasConnection {
    return { id: `connection-${fromNodeId}`, fromNodeId, toNodeId: "target" };
}

describe("canvas node generation position mentions", () => {
    test("图片任务直接保留服务端资源引用，不读取游客缓存", async () => {
        const source = node("server-image", CanvasNodeType.Image, "/api/resources/existing-image/file");
        source.metadata.storageKey = "resource:existing-image";
        const context = buildNodeGenerationContext(source.id, [source], [], "将圆形改成紫色", []);
        const hydrated = await hydrateNodeGenerationContext(context, "canvas-test", undefined, "image");
        expect(hydrated.referenceImages).toEqual(context.referenceImages);
        expect(hydrated.imageCount).toBe(1);
    });

    test("图片任务直接保留上游 HTTPS 参考图，不在浏览器重新下载", async () => {
        const source = node("remote-image", CanvasNodeType.Image, "https://example.com/reference.png");
        const context = buildNodeGenerationContext(source.id, [source], [], "修改背景", []);
        const hydrated = await hydrateNodeGenerationContext(context, "canvas-test", undefined, "image");
        expect(hydrated.referenceImages).toEqual(context.referenceImages);
        expect(hydrated.imageCount).toBe(1);
    });

    test("已有图片节点显式引用自身时作为图生图参考图提交", () => {
        const source = node("image-self", CanvasNodeType.Image, "data:image/png;base64,a");
        source.metadata.composerContent = "将 @图片1 图片变清晰";

        const context = buildNodeGenerationContext(source.id, [source], [], source.metadata.composerContent, []);

        expect(context.referenceImages.map((image) => image.id)).toEqual([source.id]);
        expect(context.imageCount).toBe(1);
        expect(context.prompt).toBe("将 @图片1 图片变清晰");
    });

    test("图片面板默认展示的自身参考无需 @ 也参与图改图", () => {
        const source = node("image-self", CanvasNodeType.Image, "data:image/png;base64,a");
        const context = buildNodeGenerationContext(source.id, [source], [], "将圆形改成绿色", []);

        expect(context.referenceImages.map((image) => image.id)).toEqual([source.id]);
        expect(context.imageCount).toBe(1);
    });

    test("移除自身参考后恢复无图文生图，重新启用后恢复图改图", () => {
        const source = node("image-self", CanvasNodeType.Image, "data:image/png;base64,a");
        source.metadata.excludeSelfReference = true;
        const context = buildNodeGenerationContext(source.id, [source], [], "生成一个新的构图", []);

        expect(context.referenceImages).toEqual([]);
        expect(context.imageCount).toBe(0);
        source.metadata.excludeSelfReference = false;
        expect(buildNodeGenerationContext(source.id, [source], [], "将圆形改成绿色", []).imageCount).toBe(1);
    });

    test("生成结果有入边时只引用源图，不额外把旧结果当作输入", () => {
        const original = node("original", CanvasNodeType.Image, "data:image/png;base64,a");
        const result = node("target", CanvasNodeType.Image, "data:image/png;base64,b");
        const context = buildNodeGenerationContext(result.id, [original, result], [connection(original.id)], "修改颜色", []);
        expect(context.referenceImages.map((image) => image.id)).toEqual([original.id]);
    });

    test("空白图片节点仍按文生图提交", () => {
        const source = node("image-empty", CanvasNodeType.Image, "");
        const context = buildNodeGenerationContext(source.id, [source], [], "生成一个新的构图", []);
        expect(context.referenceImages).toEqual([]);
        expect(context.prompt).toBe("生成一个新的构图");
    });

    test("无法解析的画布引用会阻止静默降级为文生图", () => {
        const target = targetNode();
        expect(() => buildNodeGenerationContext(target.id, [target], [], "将 @图片1 图片变清晰", [])).toThrow("@图片1 没有对应的画布资源");
    });

    test("同一个 @图片1 在换线后自动指向新的第一张图片", () => {
        const target = targetNode();
        const imageA = node("image-a", CanvasNodeType.Image, "data:image/png;base64,a");
        const imageB = node("image-b", CanvasNodeType.Image, "data:image/png;base64,b");

        const before = buildNodeGenerationContext(target.id, [imageA, target], [connection(imageA.id)], "让 @图片1 进入画面", []);
        const after = buildNodeGenerationContext(target.id, [imageB, target], [connection(imageB.id)], "让 @图片1 进入画面", []);

        expect(before.referenceImages.map((image) => image.id)).toEqual(["image-a"]);
        expect(after.referenceImages.map((image) => image.id)).toEqual(["image-b"]);
        expect(before.prompt).toBe("让 @图片1 进入画面");
        expect(after.prompt).toBe("让 @图片1 进入画面");
    });

    test("按类型位置选择资源，提示词出现顺序不会改变槽位含义", () => {
        const target = targetNode();
        const imageA = node("image-a", CanvasNodeType.Image, "data:image/png;base64,a");
        const audioA = node("audio-a", CanvasNodeType.Audio, "data:audio/mpeg;base64,a");
        const imageB = node("image-b", CanvasNodeType.Image, "data:image/png;base64,b");
        const connections = [connection(imageA.id), connection(audioA.id), connection(imageB.id)];
        const context = buildNodeGenerationContext(target.id, [imageA, audioA, imageB, target], connections, "让 @图片2 配合 @音频1", []);

        expect(context.referenceImages.map((image) => image.id)).toEqual(["image-b"]);
        expect(context.referenceAudios.map((audio) => audio.id)).toEqual(["audio-a"]);
        expect(context.prompt).toBe("让 @图片1 配合 @音频1");
    });

    test("旧节点 token 只做读取迁移，不再进入生成提示词", () => {
        const target = targetNode();
        const image = node("image-a", CanvasNodeType.Image, "data:image/png;base64,a");
        const context = buildNodeGenerationContext(target.id, [image, target], [connection(image.id)], "让 @[node:image-a] 进入画面", []);

        expect(context.referenceImages.map((item) => item.id)).toEqual(["image-a"]);
        expect(context.prompt).toBe("让 @图片1 进入画面");
        expect(context.prompt).not.toContain("@[node:");
    });
});
