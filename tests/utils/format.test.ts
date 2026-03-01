import { describe, it, expect } from "vitest";
import { colorStatus, formatPlanTable, formatPlanJson } from "../../src/utils/format.js";
import type { Plan } from "../../src/core/plan.js";

describe("colorStatus", () => {
  it("returns string for each valid status", () => {
    expect(colorStatus("draft")).toContain("draft");
    expect(colorStatus("active")).toContain("active");
    expect(colorStatus("done")).toContain("done");
  });
});

describe("formatPlanTable", () => {
  it("returns dim message when no plans", () => {
    const result = formatPlanTable([]);
    expect(result).toContain("No plans found.");
  });

  it("formats plan with status and filename", () => {
    const plans: Plan[] = [
      {
        filename: "test.md",
        filepath: "/tmp/test.md",
        content: "# Test",
        meta: {
          status: "active",
          created: "2026-01-01T00:00:00.000Z",
          updated: "2026-01-01T00:00:00.000Z",
        },
      },
    ];
    const result = formatPlanTable(plans);
    expect(result).toContain("active");
    expect(result).toContain("test.md");
  });

  it("shows unknown for plan without meta", () => {
    const plans: Plan[] = [
      {
        filename: "orphan.md",
        filepath: "/tmp/orphan.md",
        content: "# Orphan",
        meta: null,
      },
    ];
    const result = formatPlanTable(plans);
    expect(result).toContain("unknown");
    expect(result).toContain("orphan.md");
  });
});

describe("formatPlanJson", () => {
  it("returns valid JSON array", () => {
    const plans: Plan[] = [
      {
        filename: "a.md",
        filepath: "/tmp/a.md",
        content: "# A",
        meta: {
          status: "done",
          created: "2026-01-01T00:00:00.000Z",
          updated: "2026-01-02T00:00:00.000Z",
        },
      },
    ];
    const result = JSON.parse(formatPlanJson(plans));
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe("a.md");
    expect(result[0].status).toBe("done");
    expect(result[0].hasMeta).toBe(true);
  });

  it("handles plan without meta", () => {
    const plans: Plan[] = [
      {
        filename: "b.md",
        filepath: "/tmp/b.md",
        content: "# B",
        meta: null,
      },
    ];
    const result = JSON.parse(formatPlanJson(plans));
    expect(result[0].hasMeta).toBe(false);
    expect(result[0].status).toBeNull();
  });
});
