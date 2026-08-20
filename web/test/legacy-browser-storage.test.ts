import assert from "node:assert/strict";
import test from "node:test";

import { copyMissingLegacyEntry, copyMissingLegacySyncEntry } from "../src/lib/legacy-browser-storage";

test("legacy async storage is copied without deleting the source", async () => {
    const entries = new Map([["legacy", "old-canvas"]]);
    const storage = {
        getItem: async (key: string) => entries.get(key) || null,
        setItem: async (key: string, value: string) => { entries.set(key, value); },
    };
    assert.equal(await copyMissingLegacyEntry(storage, "legacy", "guest"), true);
    assert.equal(entries.get("legacy"), "old-canvas");
    assert.equal(entries.get("guest"), "old-canvas");
});

test("legacy async storage never overwrites existing guest data", async () => {
    const entries = new Map([["legacy", "old-canvas"], ["guest", "new-canvas"]]);
    const storage = {
        getItem: async (key: string) => entries.get(key) || null,
        setItem: async (key: string, value: string) => { entries.set(key, value); },
    };
    assert.equal(await copyMissingLegacyEntry(storage, "legacy", "guest"), false);
    assert.equal(entries.get("guest"), "new-canvas");
});

test("legacy config is copied only when the guest config is empty", () => {
    const entries = new Map([["legacy", "old-config"]]);
    const storage = {
        getItem: (key: string) => entries.get(key) || null,
        setItem: (key: string, value: string) => { entries.set(key, value); },
    };
    assert.equal(copyMissingLegacySyncEntry(storage, "legacy", "guest"), true);
    entries.set("legacy", "changed-old-config");
    assert.equal(copyMissingLegacySyncEntry(storage, "legacy", "guest"), false);
    assert.equal(entries.get("guest"), "old-config");
});
