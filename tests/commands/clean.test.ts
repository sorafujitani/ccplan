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
});
