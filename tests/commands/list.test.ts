import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { scanPlansWithMeta } from "../../src/core/plan.js";
import { formatPlanJson } from "../../src/utils/format.js";

const FIXTURES_DIR = join(import.meta.dirname, "../fixtures/plans");
let tempDir: string;

beforeEach(async () => {
  tempDir = join(tmpdir(), `ccplan-test-${randomUUID()}`);
  await cp(FIXTURES_DIR, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("list command logic", () => {
  it("filters by status", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const active = plans.filter((p) => p.meta?.status === "active");
    expect(active.length).toBe(2);
    expect(active.some((p) => p.filename === "plan-active.md")).toBe(true);
    expect(active.some((p) => p.filename === "plan-no-meta.md")).toBe(true);
  });

  it("sorts by updated descending", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const withDates = plans.filter((p) => p.meta?.updated);
    withDates.sort((a, b) => {
      const aDate = a.meta?.updated ?? "";
      const bDate = b.meta?.updated ?? "";
      return bDate.localeCompare(aDate);
    });

    // plan-no-meta.md is auto-registered with current timestamp, so it comes first
    // plan-active.md (2026-02-20) should come before plan-draft.md (2026-02-01)
    const knownPlans = withDates.filter(
      (p) => p.filename !== "plan-no-meta.md",
    );
    expect(knownPlans[0].meta!.updated).toBe("2026-02-20T12:00:00.000Z");
  });

  it("outputs valid JSON", async () => {
    const plans = await scanPlansWithMeta(tempDir);
    const json = formatPlanJson(plans);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(4);
    expect(parsed[0]).toHaveProperty("filename");
    expect(parsed[0]).toHaveProperty("hasMeta");
  });
});
