import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parse, formatOptionsHelp } from "../../src/cli/args.js";
import type { OptionDefs } from "../../src/cli/args.js";

// Generator: valid option name (lowercase, no spaces, no dashes at start)
const arbOptionName = fc.stringMatching(/^[a-z]{2,12}$/);

// Generator: OptionDefs with unique names
const arbOptionDefs: fc.Arbitrary<OptionDefs> = fc
  .array(
    fc.tuple(
      arbOptionName,
      fc.record({
        type: fc.constantFrom("string" as const, "boolean" as const),
        description: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
      }),
    ),
    { minLength: 0, maxLength: 5 },
  )
  .map((entries) => {
    const defs: OptionDefs = {};
    for (const [name, def] of entries) {
      if (!(name in defs)) {
        defs[name] = def;
      }
    }
    return defs;
  });

describe("Args Property-Based Tests", () => {
  // =========================================================================
  // P25: Invariant — parse returns valid structure for valid args
  // =========================================================================
  describe("P25: parse returns valid structure", () => {
    it("∀ valid args: result has positionals array and values object", () => {
      fc.assert(
        fc.property(arbOptionDefs, (options) => {
          // Build valid args from the option definitions
          const args: string[] = [];
          for (const [name, def] of Object.entries(options)) {
            if (def.type === "boolean") {
              args.push(`--${name}`);
            } else {
              args.push(`--${name}`, "test-value");
            }
          }

          const result = parse(args, options);
          expect(Array.isArray(result.positionals)).toBe(true);
          expect(typeof result.values).toBe("object");
          expect(result.values).not.toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it("boolean flags are parsed as true", () => {
      fc.assert(
        fc.property(arbOptionName, (name) => {
          const options = { [name]: { type: "boolean" as const } };
          const result = parse([`--${name}`], options);
          expect(result.values[name]).toBe(true);
        }),
        { numRuns: 50 },
      );
    });

    it("string options capture their values", () => {
      fc.assert(
        fc.property(
          arbOptionName,
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.startsWith("-")),
          (name, value) => {
            const options = { [name]: { type: "string" as const } };
            const result = parse([`--${name}`, value], options);
            expect(result.values[name]).toBe(value);
          },
        ),
        { numRuns: 50 },
      );
    });

    it("positional args are collected separately", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(
              (s) => !s.startsWith("-") && s.length > 0,
            ),
            { minLength: 0, maxLength: 5 },
          ),
          (positionals) => {
            const result = parse(positionals, {});
            expect(result.positionals).toEqual(positionals);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // =========================================================================
  // P26: Metamorphic — formatOptionsHelp contains all option names
  // =========================================================================
  describe("P26: formatOptionsHelp contains all option names", () => {
    it("∀ options: every option name appears as --name in output", () => {
      fc.assert(
        fc.property(arbOptionDefs, (options) => {
          const output = formatOptionsHelp(options);
          for (const name of Object.keys(options)) {
            expect(output).toContain(`--${name}`);
          }
        }),
        { numRuns: 100 },
      );
    });

    it("string options include type hint", () => {
      fc.assert(
        fc.property(arbOptionName, (name) => {
          const options: OptionDefs = { [name]: { type: "string" } };
          const output = formatOptionsHelp(options);
          expect(output).toContain(`<${name}>`);
        }),
        { numRuns: 50 },
      );
    });

    it("boolean options do not include type hint", () => {
      fc.assert(
        fc.property(arbOptionName, (name) => {
          const options: OptionDefs = { [name]: { type: "boolean" } };
          const output = formatOptionsHelp(options);
          expect(output).not.toContain(`<${name}>`);
        }),
        { numRuns: 50 },
      );
    });
  });
});
