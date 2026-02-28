import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scanPlans, readPlan, resolvePlanFile } from "../../src/core/plan.js";

const FIXTURES_DIR = join(import.meta.dirname, "../fixtures/plans");

describe("scanPlans", () => {
  it("scans all .md files in directory", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    expect(plans.length).toBe(5);
    expect(plans.every((p) => p.filename.endsWith(".md"))).toBe(true);
  });

  it("correctly identifies plans with and without frontmatter", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const withMeta = plans.filter((p) => p.hasFrontmatter);
    const withoutMeta = plans.filter((p) => !p.hasFrontmatter);

    expect(withMeta.length).toBe(4);
    expect(withoutMeta.length).toBe(1);
  });
});

describe("readPlan", () => {
  it("reads a plan with frontmatter", async () => {
    const plan = await readPlan(join(FIXTURES_DIR, "plan-active.md"));
    expect(plan.filename).toBe("plan-active.md");
    expect(plan.hasFrontmatter).toBe(true);
    expect(plan.frontmatter!.status).toBe("active");
    expect(plan.frontmatter!.branch).toBe("feature/auth");
  });

  it("reads a plan without frontmatter", async () => {
    const plan = await readPlan(join(FIXTURES_DIR, "plan-no-meta.md"));
    expect(plan.hasFrontmatter).toBe(false);
    expect(plan.frontmatter).toBeNull();
    expect(plan.content).toContain("Plan Without Metadata");
  });
});

describe("resolvePlanFile", () => {
  it("resolves exact filename match", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const result = resolvePlanFile(plans, "plan-active.md");
    expect(result).toBeDefined();
    expect(result!.filename).toBe("plan-active.md");
  });

  it("resolves without .md extension", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const result = resolvePlanFile(plans, "plan-active");
    expect(result).toBeDefined();
    expect(result!.filename).toBe("plan-active.md");
  });

  it("resolves prefix match", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    // "plan-ar" uniquely matches "plan-archived.md"
    const result = resolvePlanFile(plans, "plan-ar");
    expect(result).toBeDefined();
    expect(result!.filename).toBe("plan-archived.md");
  });

  it("resolves substring match", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const result = resolvePlanFile(plans, "no-meta");
    expect(result).toBeDefined();
    expect(result!.filename).toBe("plan-no-meta.md");
  });

  it("returns undefined for no match", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const result = resolvePlanFile(plans, "nonexistent");
    expect(result).toBeUndefined();
  });

  it("returns undefined for ambiguous prefix match", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    // "plan-" matches all files as prefix
    const result = resolvePlanFile(plans, "plan-d");
    // plan-draft and plan-done both start with "plan-d"
    expect(result).toBeUndefined();
  });
});
