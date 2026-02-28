import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { cp, rm } from "node:fs/promises";
import { scanPlans } from "../../src/core/plan.js";
import { fileExists } from "../../src/utils/fs.js";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";

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
    const plans = await scanPlans(tempDir);
    const now = new Date();
    const minDays = 30;

    const targets = plans.filter((p) => {
      if (p.frontmatter?.status !== "done") return false;
      if (!p.frontmatter.updated) return true;
      const updated = new Date(p.frontmatter.updated);
      const diffDays =
        (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= minDays;
    });

    expect(targets.length).toBe(1);
    expect(targets[0].filename).toBe("plan-done.md");
  });

  it("deletes done plans", async () => {
    const plans = await scanPlans(tempDir);
    const donePlan = plans.find((p) => p.frontmatter?.status === "done");
    expect(donePlan).toBeDefined();

    await unlink(donePlan!.filepath);

    expect(await fileExists(donePlan!.filepath)).toBe(false);
  });
});
