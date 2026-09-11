import { useCallback, useState } from "react";
import { App, Button } from "antd";
import { downloadMedia } from "@/services/media-download";

export function useMediaDownload() {
    const { message, modal } = App.useApp();
    const [pending, setPending] = useState(false);

    const download = useCallback(async (url: string, fileName: string) => {
        if (pending) return;
        setPending(true);
        try {
            await downloadMedia(url, fileName);
        } catch (error) {
            if (/^https:\/\//i.test(url)) {
                modal.info({
                    title: "打开原图保存",
                    content: <div className="space-y-4">
                        <p>图片链接暂不支持直接下载。请在新窗口打开原图，右键选择“图像另存为”。当前创作页会继续保留。</p>
                        <Button type="primary" href={url} target="_blank" rel="noopener noreferrer">新窗口打开原图</Button>
                    </div>,
                    okText: "关闭",
                });
            } else {
                message.error(error instanceof Error ? error.message : "下载失败，请稍后重试");
            }
        } finally {
            setPending(false);
        }
    }, [message, modal, pending]);

    return { download, pending };
}
