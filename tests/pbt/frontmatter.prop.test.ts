import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { isValidStatus, VALID_STATUSES } from "../../src/core/frontmatter.js";
import { arbStatus } from "./generators.js";

describe("Frontmatter Property-Based Tests", () => {
  // =========================================================================
  // P13: Oracle — isValidStatus matches VALID_STATUSES.includes
  // =========================================================================
  describe("P13: isValidStatus oracle", () => {
    it("∀ s: isValidStatus(s) === VALID_STATUSES.includes(s)", () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const expected = (VALID_STATUSES as readonly string[]).includes(s);
          expect(isValidStatus(s)).toBe(expected);
        }),
        { numRuns: 500 },
      );
    });

    it("all valid statuses return true", () => {
      fc.assert(
        fc.property(arbStatus, (status) => {
          expect(isValidStatus(status)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it("case variations are rejected", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("Draft", "DRAFT", "Active", "ACTIVE", "Done", "DONE", "dRaFt"),
          (s) => {
            expect(isValidStatus(s)).toBe(false);
          },
        ),
      );
    });

    it("padded strings are rejected", () => {
      fc.assert(
        fc.property(arbStatus, fc.string({ minLength: 1 }), (status, padding) => {
          expect(isValidStatus(` ${status}`)).toBe(false);
          expect(isValidStatus(`${status} `)).toBe(false);
          expect(isValidStatus(`${padding}${status}`)).toBe(
            (VALID_STATUSES as readonly string[]).includes(`${padding}${status}`),
          );
        }),
        { numRuns: 100 },
      );
    });
  });
});
