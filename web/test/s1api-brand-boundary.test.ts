import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

function runtimeSources(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return runtimeSources(path);
        return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
    });
}

test("S1API runtime does not expose upstream sponsorship or promotion", () => {
    const sourceRoot = resolve(import.meta.dir, "../src");
    const runtime = runtimeSources(sourceRoot).map((path) => readFileSync(path, "utf8")).join("\n");
    const bundledChangelog = readFileSync(resolve(import.meta.dir, "../../CHANGELOG.md"), "utf8");

    expect(runtime).not.toMatch(/赞助商|赞助我们|社区致谢|contributors?|sponsors?/i);
    expect(runtime).not.toContain('href="https://github.com/ddcat-ai/open-ai-canvas');
    expect(bundledChangelog).not.toMatch(/赞助商|赞助我们|项目贡献者列表|社区致谢/);
});

test("S1API remains the built-in appearance and update source", () => {
    const appearance = readFileSync(resolve(import.meta.dir, "../src/stores/use-appearance-store.ts"), "utf8");
    const updater = readFileSync(resolve(import.meta.dir, "../src/pages/admin/settings/system-update-page.tsx"), "utf8");

    expect(appearance).toContain('brandName: "S1API Studio"');
    expect(appearance).toContain('brandSlug: "s1api-studio"');
    expect(updater).toContain('offline-vector/open-ai-canvas');
});
