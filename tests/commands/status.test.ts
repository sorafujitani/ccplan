import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { readFile, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { scanPlansWithMeta, resolvePlanFile } from "../../src/core/plan.js";
import {
  readMetaStore,
  writeMetaStore,
  setMeta,
} from "../../src/core/metastore.js";

const FIXTURES_DIR = join(import.meta.dirname, "../fixtures/plans");
let tempDir: string;

beforeEach(async () => {
  tempDir = join(tmpdir(), `ccplan-test-${randomUUID()}`);
  await cp(FIXTURES_DIR, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("status command logic", () => {
  it("changes status via metastore without modifying plan file", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const plan = resolvePlanFile(plans, "plan-draft");
    expect(plan).toBeDefined();

    const originalContent = await readFile(plan!.filepath, "utf-8");

    let store = await readMetaStore(tempDir);
    store = setMeta(store, plan!.filename, { status: "active" });
    await writeMetaStore(tempDir, store);

    const afterContent = await readFile(plan!.filepath, "utf-8");
    expect(afterContent).toBe(originalContent);

    const updatedStore = await readMetaStore(tempDir);
    expect(updatedStore.plans[plan!.filename].status).toBe("active");
  });

  it("creates meta entry for plan without prior metadata", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const plan = resolvePlanFile(plans, "plan-no-meta");
    expect(plan).toBeDefined();
    expect(plan!.meta).not.toBeNull();

    let store = await readMetaStore(tempDir);
    store = setMeta(store, plan!.filename, { status: "done" });
    await writeMetaStore(tempDir, store);

    const updatedStore = await readMetaStore(tempDir);
    expect(updatedStore.plans[plan!.filename].status).toBe("done");
  });
});
