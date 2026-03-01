import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { resolvePlanFile } from "../../src/core/plan.js";
import type { Plan } from "../../src/core/plan.js";
import { arbFilename, arbPlan } from "./generators.js";

describe("Plan Property-Based Tests", () => {
  // =========================================================================
  // P15: Metamorphic — resolvePlanFile is path-prefix invariant
  // =========================================================================
  describe("P15: resolvePlanFile is path-prefix invariant", () => {
    it("∀ plans, ref, prefix: resolvePlanFile(plans, ref) === resolvePlanFile(plans, prefix/ref)", () => {
      fc.assert(
        fc.property(
          fc.array(arbPlan, { minLength: 1, maxLength: 10 }),
          fc.constantFrom(...["some/path", "/absolute/path", "./relative", "a/b/c"]),
          (plans, prefix) => {
            // Pick a filename from the plans to ensure potential match
            const ref = plans[0].filename;
            const withPrefix = `${prefix}/${ref}`;

            const result1 = resolvePlanFile(plans, ref);
            const result2 = resolvePlanFile(plans, withPrefix);

            // Both should resolve to the same plan (or both undefined)
            if (result1) {
              expect(result2).toBeDefined();
              expect(result2!.filename).toBe(result1.filename);
            } else {
              expect(result2).toBeUndefined();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it("arbitrary prefix does not change resolution", () => {
      fc.assert(
        fc.property(
          fc.array(arbPlan, { minLength: 1, maxLength: 10 }),
          arbFilename,
          fc.stringMatching(/^[a-f/]{0,20}$/),
          (plans, ref, prefix) => {
            const bareResult = resolvePlanFile(plans, ref);
            const prefixedResult = resolvePlanFile(plans, `${prefix}/${ref}`);

            if (bareResult) {
              expect(prefixedResult).toBeDefined();
              expect(prefixedResult!.filename).toBe(bareResult.filename);
            } else {
              expect(prefixedResult).toBeUndefined();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P16: Metamorphic — .md extension equivalence
  // =========================================================================
  describe("P16: resolvePlanFile .md extension equivalence", () => {
    it("∀ plans, name: resolving 'name' and 'name.md' yield same plan when found via fallback", () => {
      fc.assert(
        fc.property(
          fc.array(arbPlan, { minLength: 1, maxLength: 10 }),
          (plans) => {
            // Take a filename from plans, strip .md, resolve both ways
            const fullName = plans[0].filename; // e.g. "abc.md"
            if (!fullName.endsWith(".md")) return; // skip non-.md filenames

            const baseName = fullName.slice(0, -3); // "abc"
            if (baseName.length === 0) return; // skip edge case

            const resultFull = resolvePlanFile(plans, fullName);
            const resultBase = resolvePlanFile(plans, baseName);

            // Both should resolve to the same plan
            if (resultFull) {
              expect(resultBase).toBeDefined();
              expect(resultBase!.filename).toBe(resultFull.filename);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
