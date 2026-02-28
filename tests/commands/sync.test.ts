import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scanPlans } from "../../src/core/plan.js";

const FIXTURES_DIR = join(import.meta.dirname, "../fixtures/plans");

describe("sync command logic", () => {
  it("identifies linked plans that are not done/archived", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const linked = plans.filter(
      (p) =>
        p.frontmatter?.branch &&
        p.frontmatter.status !== "done" &&
        p.frontmatter.status !== "archived",
    );

    expect(linked.length).toBe(1);
    expect(linked[0].filename).toBe("plan-active.md");
    expect(linked[0].frontmatter!.branch).toBe("feature/auth");
  });

  it("excludes plans without branch", async () => {
    const plans = await scanPlans(FIXTURES_DIR);
    const linked = plans.filter((p) => p.frontmatter?.branch);
    const noBranch = plans.filter((p) => !p.frontmatter?.branch);

    expect(linked.length).toBe(2); // active + done
    expect(noBranch.length).toBe(3);
  });
});
