import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { readFile, writeFile, cp, rm } from "node:fs/promises";
import { scanPlans, resolvePlanFile } from "../../src/core/plan.js";
import {
  parsePlan,
  serializePlan,
  createDefaultFrontmatter,
} from "../../src/core/frontmatter.js";
import type { PlanStatus } from "../../src/core/frontmatter.js";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

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
  it("changes status of a plan", async () => {
    const plans = await scanPlans(tempDir);
    const plan = resolvePlanFile(plans, "plan-draft");
    expect(plan).toBeDefined();

    const raw = await readFile(plan!.filepath, "utf-8");
    const updated = serializePlan(raw, { status: "active" as PlanStatus });
    const targetPath = join(tempDir, plan!.filename);
    await writeFile(targetPath, updated, "utf-8");

    const reRead = await readFile(targetPath, "utf-8");
    const parsed = parsePlan(reRead);
    expect(parsed.frontmatter!.status).toBe("active");
  });

  it("auto-initializes frontmatter when missing", async () => {
    const plans = await scanPlans(tempDir);
    const plan = resolvePlanFile(plans, "plan-no-meta");
    expect(plan).toBeDefined();
    expect(plan!.hasFrontmatter).toBe(false);

    const raw = await readFile(plan!.filepath, "utf-8");
    const defaults = createDefaultFrontmatter();
    defaults.status = "active";
    const updated = serializePlan(raw, defaults);
    const targetPath = join(tempDir, plan!.filename);
    await writeFile(targetPath, updated, "utf-8");

    const reRead = await readFile(targetPath, "utf-8");
    const parsed = parsePlan(reRead);
    expect(parsed.frontmatter).not.toBeNull();
    expect(parsed.frontmatter!.status).toBe("active");
  });
});
