import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  scanPlans,
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

  it("correctly identifies plans with and without frontmatter", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const withMeta = plans.filter((p) => p.hasFrontmatter);
    const withoutMeta = plans.filter((p) => !p.hasFrontmatter);

    expect(withMeta.length).toBe(3);
    expect(withoutMeta.length).toBe(1);
  });
});

describe("readPlan", () => {
  it("reads a plan with frontmatter", async () => {
    const plan = await readPlan(join(FIXTURES_DIR, "plan-active.md"));
    expect(plan.filename).toBe("plan-active.md");
    expect(plan.hasFrontmatter).toBe(true);
    expect(plan.frontmatter!.status).toBe("active");
  });

  it("reads a plan without frontmatter", async () => {
    const plan = await readPlan(join(FIXTURES_DIR, "plan-no-meta.md"));
    expect(plan.hasFrontmatter).toBe(false);
    expect(plan.frontmatter).toBeNull();
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
