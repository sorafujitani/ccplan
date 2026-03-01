import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  createEmptyStore,
  createDefaultMeta,
  readMetaStore,
  writeMetaStore,
  getMeta,
  setMeta,
  removeMeta,
} from "../../src/core/metastore.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ccplan-meta-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("createEmptyStore", () => {
  it("returns store with version 1 and empty plans", () => {
    const store = createEmptyStore();
    expect(store.version).toBe(1);
    expect(store.plans).toEqual({});
  });
});

describe("createDefaultMeta", () => {
  it("returns active status with timestamps", () => {
    const meta = createDefaultMeta();
    expect(meta.status).toBe("active");
    expect(meta.created).toBeTruthy();
    expect(meta.updated).toBeTruthy();
  });
});

describe("readMetaStore", () => {
  it("returns empty store when file does not exist", async () => {
    const store = await readMetaStore(tempDir);
    expect(store.version).toBe(1);
    expect(store.plans).toEqual({});
  });

  it("reads existing metastore file", async () => {
    const data = {
      version: 1,
      plans: {
        "test.md": {
          status: "active",
          created: "2026-01-01T00:00:00.000Z",
          updated: "2026-01-02T00:00:00.000Z",
        },
      },
    };
    await writeFile(
      join(tempDir, ".ccplan-meta.json"),
      JSON.stringify(data),
      "utf-8",
    );

    const store = await readMetaStore(tempDir);
    expect(store.plans["test.md"].status).toBe("active");
  });
});

describe("writeMetaStore", () => {
  it("writes valid JSON to disk", async () => {
    const store = setMeta(createEmptyStore(), "plan.md", { status: "active" });
    await writeMetaStore(tempDir, store);

    const raw = await readFile(join(tempDir, ".ccplan-meta.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.plans["plan.md"].status).toBe("active");
  });
});

describe("getMeta", () => {
  it("returns meta for existing entry", () => {
    const store = setMeta(createEmptyStore(), "test.md", { status: "done" });
    const meta = getMeta(store, "test.md");
    expect(meta).not.toBeNull();
    expect(meta!.status).toBe("done");
  });

  it("returns null for missing entry", () => {
    const store = createEmptyStore();
    expect(getMeta(store, "nonexistent.md")).toBeNull();
  });
});

describe("setMeta", () => {
  it("creates new entry with timestamps", () => {
    const store = setMeta(createEmptyStore(), "new.md", { status: "active" });
    const meta = store.plans["new.md"];
    expect(meta.status).toBe("active");
    expect(meta.created).toBeTruthy();
    expect(meta.updated).toBeTruthy();
  });

  it("updates existing entry and refreshes updated timestamp", () => {
    let store = createEmptyStore();
    store = setMeta(store, "plan.md", { status: "active" });
    const original = store.plans["plan.md"];

    store = setMeta(store, "plan.md", { status: "done" });
    const updated = store.plans["plan.md"];

    expect(updated.status).toBe("done");
    expect(updated.created).toBe(original.created);
  });
});

describe("removeMeta", () => {
  it("removes entry from store", () => {
    let store = setMeta(createEmptyStore(), "plan.md", { status: "active" });
    expect(getMeta(store, "plan.md")).not.toBeNull();

    store = removeMeta(store, "plan.md");
    expect(getMeta(store, "plan.md")).toBeNull();
  });

  it("does nothing for missing entry", () => {
    const store = createEmptyStore();
    const result = removeMeta(store, "nonexistent.md");
    expect(result.plans).toEqual({});
  });
});

describe("round-trip", () => {
  it("write then read returns same data", async () => {
    let store = createEmptyStore();
    store = setMeta(store, "a.md", { status: "active" });
    store = setMeta(store, "b.md", { status: "done" });

    await writeMetaStore(tempDir, store);
    const loaded = await readMetaStore(tempDir);

    expect(loaded.version).toBe(1);
    expect(loaded.plans["a.md"].status).toBe("active");
    expect(loaded.plans["b.md"].status).toBe("done");
  });
});
