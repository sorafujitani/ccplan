import { describe, it, expect } from "vitest";
import {
  parsePlan,
  serializePlan,
  createDefaultFrontmatter,
  isValidStatus,
} from "../../src/core/frontmatter.js";

describe("isValidStatus", () => {
  it("accepts valid statuses", () => {
    expect(isValidStatus("draft")).toBe(true);
    expect(isValidStatus("active")).toBe(true);
    expect(isValidStatus("done")).toBe(true);
    expect(isValidStatus("archived")).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(isValidStatus("unknown")).toBe(false);
    expect(isValidStatus("")).toBe(false);
  });
});

describe("createDefaultFrontmatter", () => {
  it("returns draft status with timestamps", () => {
    const fm = createDefaultFrontmatter();
    expect(fm.status).toBe("draft");
    expect(fm.created).toBeTruthy();
    expect(fm.updated).toBeTruthy();
    expect(fm.branch).toBeUndefined();
  });
});

describe("parsePlan", () => {
  it("parses plan with ccplan frontmatter", () => {
    const raw = `---
ccplan:
  status: active
  created: "2026-01-01T00:00:00.000Z"
  updated: "2026-01-02T00:00:00.000Z"
  branch: feature/foo
---

# My Plan
Content here.`;

    const result = parsePlan(raw);
    expect(result.frontmatter).not.toBeNull();
    expect(result.frontmatter!.status).toBe("active");
    expect(result.frontmatter!.branch).toBe("feature/foo");
    expect(result.content).toContain("# My Plan");
  });

  it("returns null frontmatter for plan without ccplan namespace", () => {
    const raw = `---
title: Some plan
---

# Content`;

    const result = parsePlan(raw);
    expect(result.frontmatter).toBeNull();
  });

  it("returns null frontmatter for plan without any frontmatter", () => {
    const raw = "# Just a plan\n\nNo frontmatter.";
    const result = parsePlan(raw);
    expect(result.frontmatter).toBeNull();
    expect(result.content).toContain("# Just a plan");
  });

  it("defaults to draft for invalid status", () => {
    const raw = `---
ccplan:
  status: invalid
  created: "2026-01-01T00:00:00.000Z"
  updated: "2026-01-01T00:00:00.000Z"
---

Content`;

    const result = parsePlan(raw);
    expect(result.frontmatter!.status).toBe("draft");
  });
});

describe("serializePlan", () => {
  it("adds ccplan namespace to plan without frontmatter", () => {
    const raw = "# My Plan\n\nContent.";
    const result = serializePlan(raw, { status: "active" });

    expect(result).toContain("ccplan:");
    expect(result).toContain("status: active");
    expect(result).toContain("# My Plan");
  });

  it("updates existing ccplan frontmatter", () => {
    const raw = `---
ccplan:
  status: draft
  created: "2026-01-01T00:00:00.000Z"
  updated: "2026-01-01T00:00:00.000Z"
---

# Plan`;

    const result = serializePlan(raw, { status: "active" });
    expect(result).toContain("status: active");
    expect(result).not.toContain("status: draft");
  });

  it("preserves non-ccplan frontmatter keys", () => {
    const raw = `---
title: My Plan
ccplan:
  status: draft
  created: "2026-01-01T00:00:00.000Z"
  updated: "2026-01-01T00:00:00.000Z"
---

Content`;

    const result = serializePlan(raw, { status: "active" });
    expect(result).toContain("title: My Plan");
    expect(result).toContain("status: active");
  });

  it("roundtrip: parse then serialize preserves content", () => {
    const raw = `---
ccplan:
  status: draft
  created: "2026-01-01T00:00:00.000Z"
  updated: "2026-01-01T00:00:00.000Z"
  branch: main
---

# Plan Title

Some content here.`;

    const parsed = parsePlan(raw);
    const serialized = serializePlan(raw, { status: "active" });
    const reParsed = parsePlan(serialized);

    expect(reParsed.frontmatter!.status).toBe("active");
    expect(reParsed.frontmatter!.branch).toBe("main");
    expect(reParsed.content.trim()).toContain("# Plan Title");
    expect(reParsed.content.trim()).toContain("Some content here.");
  });
});
