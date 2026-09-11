import { saveAs } from "file-saver";
import { isResourceUrl } from "@/services/api/resources";

/** 先读取为浏览器 Blob，避免跨域 download 链接把当前工作区导航走。 */
export async function downloadMedia(url: string, fileName: string) {
    const response = await fetch(url, {
        credentials: isResourceUrl(url) ? "include" : "same-origin",
        signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`下载失败（${response.status}），请稍后重试`);
    const blob = await response.blob();
    if (!blob.size) throw new Error("下载内容为空，请稍后重试");
    const mime = blob.type.split(";", 1)[0];
    if (mime === "text/html" || mime === "application/json") throw new Error("图片链接未返回媒体文件，请检查结果是否已过期");
    const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm" } as Record<string, string>)[mime] || "bin";
    saveAs(blob, /\.[a-z0-9]{2,5}$/i.test(fileName) ? fileName : `${fileName}.${extension}`);
}
