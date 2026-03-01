import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  scanPlans,
  scanPlansWithMeta,
  readPlan,
  resolvePlanFile,
  getLatestPlan,
} from "../../src/core/plan.js";

const FIXTURES_DIR = join(import.meta.dirname, "../fixtures/plans");

describe("scanPlans", () => {
  it("scans all .md files in directory", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    expect(plans.length).toBe(4);
    expect(plans.every((p) => p.filename.endsWith(".md"))).toBe(true);
  });

  it("returns plans with meta as null", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    expect(plans.every((p) => p.meta === null)).toBe(true);
  });
});

describe("scanPlansWithMeta", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `ccplan-test-${randomUUID()}`);
    await cp(FIXTURES_DIR, tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("attaches meta from metastore", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const active = plans.find((p) => p.filename === "plan-active.md");
    expect(active?.meta?.status).toBe("active");
  });

  it("auto-registers plans without meta as active", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const noMeta = plans.find((p) => p.filename === "plan-no-meta.md");
    expect(noMeta?.meta).not.toBeNull();
    expect(noMeta?.meta?.status).toBe("active");
  });
});

describe("readPlan", () => {
  it("reads a plan file", async () => {
    const plan = await readPlan(join(FIXTURES_DIR, "plan-active.md"));
    expect(plan.filename).toBe("plan-active.md");
    expect(plan.meta).toBeNull();
    expect(plan.content).toContain("Auth Feature Plan");
  });

  it("reads a plan without frontmatter", async () => {
    const plan = await readPlan(join(FIXTURES_DIR, "plan-no-meta.md"));
    expect(plan.meta).toBeNull();
    expect(plan.content).toContain("Plan Without Metadata");
  });
});

describe("resolvePlanFile", () => {
  it("resolves exact filename match", () => {
    const plans = [
      { filename: "plan-active.md", filepath: "/x/plan-active.md" },
    ] as any[];
    const result = resolvePlanFile(plans, "plan-active.md");
    expect(result).toBeDefined();
    expect(result!.filename).toBe("plan-active.md");
  });

  it("resolves without .md extension", () => {
    const plans = [
      { filename: "plan-active.md", filepath: "/x/plan-active.md" },
    ] as any[];
    const result = resolvePlanFile(plans, "plan-active");
    expect(result).toBeDefined();
    expect(result!.filename).toBe("plan-active.md");
  });

  it("returns undefined for partial match", () => {
    const plans = [
      { filename: "plan-active.md", filepath: "/x/plan-active.md" },
    ] as any[];
    const result = resolvePlanFile(plans, "plan-act");
    expect(result).toBeUndefined();
  });

  it("returns undefined for no match", () => {
    const plans = [
      { filename: "plan-active.md", filepath: "/x/plan-active.md" },
    ] as any[];
    const result = resolvePlanFile(plans, "nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("getLatestPlan", () => {
  it("returns the most recently modified plan", async () => {
    const plan = await getLatestPlan(FIXTURES_DIR);
    expect(plan).toBeDefined();
    expect(plan!.filename.endsWith(".md")).toBe(true);
  });
});
