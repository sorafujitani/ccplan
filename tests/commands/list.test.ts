import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scanPlans } from "../../src/core/plan.js";
import { formatPlanJson } from "../../src/utils/format.js";

const FIXTURES_DIR = join(import.meta.dirname, "../fixtures/plans");

describe("list command logic", () => {
  it("filters by status", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const active = plans.filter((p) => p.frontmatter?.status === "active");
    expect(active.length).toBe(1);
    expect(active[0].filename).toBe("plan-active.md");
  });

  it("sorts by updated descending", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const withDates = plans.filter((p) => p.frontmatter?.updated);
    withDates.sort((a, b) => {
      const aDate = a.frontmatter?.updated ?? "";
      const bDate = b.frontmatter?.updated ?? "";
      return bDate.localeCompare(aDate);
    });

    expect(withDates[0].frontmatter!.updated).toBe(
      "2026-02-20T12:00:00.000Z",
    );
  });

  it("outputs valid JSON", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const json = formatPlanJson(plans);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(4);
    expect(parsed[0]).toHaveProperty("filename");
  });
});
