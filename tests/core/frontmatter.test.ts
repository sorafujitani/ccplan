import { describe, it, expect } from "vitest";
import { isValidStatus } from "../../src/core/frontmatter.js";

describe("isValidStatus", () => {
  it("accepts valid statuses", () => {
    expect(isValidStatus("draft")).toBe(true);
    expect(isValidStatus("active")).toBe(true);
    expect(isValidStatus("done")).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(isValidStatus("unknown")).toBe(false);
    expect(isValidStatus("")).toBe(false);
  });
});
