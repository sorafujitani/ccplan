import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { colorStatus, formatPlanJson } from "../../src/utils/format.js";
import type { PlanStatus } from "../../src/core/frontmatter.js";
import { arbPlan, arbStatus } from "./generators.js";

describe("Format Property-Based Tests", () => {
  // =========================================================================
  // P14: Round-trip — formatPlanJson produces valid JSON with preserved fields
  // =========================================================================
  describe("P14: formatPlanJson round-trip", () => {
    it("∀ plans: JSON.parse(formatPlanJson(plans)) preserves fields", () => {
      fc.assert(
        fc.property(fc.array(arbPlan, { minLength: 0, maxLength: 20 }), (plans) => {
          const json = formatPlanJson(plans);
          const parsed = JSON.parse(json) as Array<{
            filename: string;
            filepath: string;
            hasMeta: boolean;
            status: PlanStatus | null;
            created: string | null;
            updated: string | null;
          }>;

          expect(parsed).toHaveLength(plans.length);

          for (let i = 0; i < plans.length; i++) {
            expect(parsed[i].filename).toBe(plans[i].filename);
            expect(parsed[i].filepath).toBe(plans[i].filepath);
            expect(parsed[i].hasMeta).toBe(plans[i].meta !== null);
            expect(parsed[i].status).toBe(plans[i].meta?.status ?? null);
            expect(parsed[i].created).toBe(plans[i].meta?.created ?? null);
            expect(parsed[i].updated).toBe(plans[i].meta?.updated ?? null);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P22: Invariant — formatPlanJson output length matches input length
  // =========================================================================
  describe("P22: formatPlanJson preserves array length", () => {
    it("∀ plans: parsed output length === input length", () => {
      fc.assert(
        fc.property(fc.array(arbPlan, { minLength: 0, maxLength: 50 }), (plans) => {
          const parsed = JSON.parse(formatPlanJson(plans));
          expect(parsed).toHaveLength(plans.length);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P23: Invariant — colorStatus output contains the status string
  // =========================================================================
  describe("P23: colorStatus contains status text", () => {
    it("∀ status: colorStatus(status).includes(status)", () => {
      fc.assert(
        fc.property(arbStatus, (status) => {
          const output = colorStatus(status);
          expect(output).toContain(status);
        }),
        { numRuns: 100 },
      );
    });
  });
});
