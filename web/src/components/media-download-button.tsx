import { Download, LoaderCircle } from "lucide-react";
import { useMediaDownload } from "@/components/use-media-download";

export function MediaDownloadButton({ url, index, count }: { url: string; index: number; count: number }) {
    const { download, pending } = useMediaDownload();
    const label = count > 1 ? `下载 ${index + 1}` : "下载";
    return <button type="button" disabled={pending} aria-label={pending ? "正在下载" : label} onClick={() => void download(url, `S1API-${index + 1}`)}>{pending ? <LoaderCircle className="animate-spin" /> : <Download />}{pending ? "正在下载" : label}</button>;
}
