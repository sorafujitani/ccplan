import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { cp, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { scanPlansWithMeta } from "../../src/core/plan.js";
import {
  readMetaStore,
  writeMetaStore,
  removeMeta,
} from "../../src/core/metastore.js";
import { fileExists } from "../../src/utils/fs.js";

const FIXTURES_DIR = join(import.meta.dirname, "../fixtures/plans");
let tempDir: string;

beforeEach(async () => {
  tempDir = join(tmpdir(), `ccplan-test-${randomUUID()}`);
  await cp(FIXTURES_DIR, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("clean command logic", () => {
  it("finds done plans older than N days", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const now = new Date();
    const minDays = 30;

    const targets = plans.filter((p) => {
      if (p.meta?.status !== "done") return false;
      if (!p.meta.updated) return true;
      const updated = new Date(p.meta.updated);
      const diffDays =
        (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= minDays;
    });

    expect(targets.length).toBe(1);
    expect(targets[0].filename).toBe("plan-done.md");
  });

  it("deletes done plans and removes metadata", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const donePlan = plans.find((p) => p.meta?.status === "done");
    expect(donePlan).toBeDefined();

    await unlink(donePlan!.filepath);

    let store = await readMetaStore(tempDir);
    store = removeMeta(store, donePlan!.filename);
    await writeMetaStore(tempDir, store);

    expect(await fileExists(donePlan!.filepath)).toBe(false);

    const updatedStore = await readMetaStore(tempDir);
    expect(updatedStore.plans[donePlan!.filename]).toBeUndefined();
  });

  it("filters by custom status (draft)", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const statusFilter = "draft";
    const now = new Date();
    const minDays = 0;

    const targets = plans.filter((p) => {
      if (p.meta?.status !== statusFilter) return false;
      if (!p.meta.updated) return true;
      const updated = new Date(p.meta.updated);
      const diffDays =
        (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= minDays;
    });

    expect(targets.length).toBe(1);
    expect(targets[0].filename).toBe("plan-draft.md");
  });

  it("filters by custom status (active)", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const statusFilter = "active";
    const now = new Date();
    const minDays = 0;

    const targets = plans.filter((p) => {
      if (p.meta?.status !== statusFilter) return false;
      if (!p.meta.updated) return true;
      const updated = new Date(p.meta.updated);
      const diffDays =
        (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= minDays;
    });

    // plan-active.md + plan-no-meta.md (defaults to active)
    expect(targets.length).toBe(2);
    const filenames = targets.map((t) => t.filename).sort();
    expect(filenames).toContain("plan-active.md");
    expect(filenames).toContain("plan-no-meta.md");
  });

  it("--all removes day limit for done plans", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const statusFilter = "done";

    // With --all, all done plans regardless of age
    const targets = plans.filter((p) => p.meta?.status === statusFilter);

    expect(targets.length).toBe(1);
    expect(targets[0].filename).toBe("plan-done.md");
  });

  it("respects custom days threshold", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const now = new Date();
    // Use a very large number of days — nothing should match
    const minDays = 9999;

    const targets = plans.filter((p) => {
      if (p.meta?.status !== "done") return false;
      if (!p.meta.updated) return true;
      const updated = new Date(p.meta.updated);
      const diffDays =
        (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= minDays;
    });

    expect(targets.length).toBe(0);
  });

  it("single file deletion targets specific plan", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const activePlan = plans.find((p) => p.filename === "plan-active.md");
    expect(activePlan).toBeDefined();

    // Single-file mode: delete regardless of status/days
    await unlink(activePlan!.filepath);
    let store = await readMetaStore(tempDir);
    store = removeMeta(store, activePlan!.filename);
    await writeMetaStore(tempDir, store);

    expect(await fileExists(activePlan!.filepath)).toBe(false);

    const updatedStore = await readMetaStore(tempDir);
    expect(updatedStore.plans[activePlan!.filename]).toBeUndefined();
  });
});
