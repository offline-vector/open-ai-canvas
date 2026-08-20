import { Popover, Switch } from "antd";
import { ChevronRight, Database, Moon, Settings2, Sun } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { AppChangelogButton } from "@/components/layout/app-changelog-modal";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore } from "@/stores/use-user-store";

type WorkspaceSidebarFooterProps = {
    expandedClassName: string;
    collapsedClassName: string;
    accountClassName: string;
};

export function WorkspaceSidebarFooter({ expandedClassName, collapsedClassName, accountClassName }: WorkspaceSidebarFooterProps) {
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const hydrated = useUserStore((state) => state.hydrated);
    const [menuOpen, setMenuOpen] = useState(false);

    if (!hydrated) return <div className="h-10 animate-pulse rounded-md bg-foreground/[.035]" />;

    return (
        <Popover
            trigger="click"
            placement="rightBottom"
            open={menuOpen}
            onOpenChange={setMenuOpen}
            content={(
                <div className="w-[232px] py-0.5">
                    <div className="flex items-center gap-3 border-b border-border/65 px-1 pb-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-foreground/55"><Database className="size-4" /></span>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">本地创作空间</div>
                            <div className="mt-0.5 truncate text-[var(--fs-label)] text-foreground/45">数据保存在当前浏览器</div>
                        </div>
                    </div>
                    <div className="py-2">
                        <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex h-9 items-center gap-2.5 rounded px-2 text-xs text-foreground/62 hover:bg-foreground/[.055] hover:text-foreground">
                            <Settings2 className="size-3.5" /><span className="flex-1">API 与偏好设置</span><ChevronRight className="size-3 text-foreground/25" />
                        </Link>
                    </div>
                    <div className="border-y border-border/65 py-2">
                        <AppChangelogButton className="flex h-8 w-full items-center gap-2 rounded px-2 text-[var(--fs-label)] text-foreground/58 hover:bg-foreground/[.055] hover:text-foreground [&_svg]:size-3.5" showLabel showVersion versionClassName="ml-auto text-[var(--fs-micro)] tabular-nums text-foreground/32" />
                    </div>
                    <div className="flex h-10 items-center px-2">
                        {theme === "dark" ? <Moon className="size-3.5 text-foreground/45" /> : <Sun className="size-3.5 text-foreground/45" />}
                        <span className="ml-2 flex-1 text-xs text-foreground/65">深色模式</span>
                        <Switch size="small" checked={theme === "dark"} onChange={(checked) => setTheme(checked ? "dark" : "light")} aria-label="深色模式" />
                    </div>
                </div>
            )}
        >
            <button type="button" className={cn("flex min-h-10 w-full min-w-0 items-center overflow-hidden rounded-md text-left transition-colors hover:bg-foreground/[.045]", collapsedClassName, accountClassName)} title="本地创作空间">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-foreground/55"><Database className="size-3.5" /></span>
                <span className={cn("min-w-0 flex-1 flex-col", expandedClassName)}>
                    <span className="truncate text-xs font-medium">本地创作空间</span>
                    <span className="mt-0.5 block truncate text-[var(--fs-micro)] text-foreground/42">无需登录</span>
                </span>
                <ChevronRight className={cn("size-3.5 shrink-0 text-foreground/30", expandedClassName)} />
            </button>
        </Popover>
    );
}
