import fc from "fast-check";
import type { PlanStatus } from "../../src/core/frontmatter.js";
import type { PlanMeta, MetaStore } from "../../src/core/metastore.js";
import type { Plan } from "../../src/core/plan.js";

// --- PlanStatus ---
export const arbStatus: fc.Arbitrary<PlanStatus> = fc.constantFrom(
  "draft" as const,
  "active" as const,
  "done" as const,
);

// --- ISO timestamp string ---
// Use integer milliseconds to avoid invalid Date from fast-check v4
const MIN_TS = new Date("2000-01-01").getTime();
const MAX_TS = new Date("2100-01-01").getTime();
export const arbISOTimestamp: fc.Arbitrary<string> = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ms) => new Date(ms).toISOString());

// --- PlanMeta ---
export const arbPlanMeta: fc.Arbitrary<PlanMeta> = fc.record({
  status: arbStatus,
  created: arbISOTimestamp,
  updated: arbISOTimestamp,
});

// --- Filename (safe alphanumeric + .md) ---
export const arbFilename: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-z0-9_-]{1,30}$/)
  .map((s) => `${s}.md`);

// --- Filename pool for stateful tests ---
export const filenamePool = [
  "a.md",
  "b.md",
  "c.md",
  "d.md",
  "e.md",
] as const;

export const arbPoolFilename: fc.Arbitrary<string> = fc.constantFrom(
  ...filenamePool,
);

// --- MetaStore ---
export const arbMetaStore: fc.Arbitrary<MetaStore> = fc
  .array(fc.tuple(arbFilename, arbPlanMeta), { minLength: 0, maxLength: 10 })
  .map((entries) => ({
    version: 1,
    plans: Object.fromEntries(entries) as Record<string, PlanMeta>,
  }));

// --- MetaStore with arbitrary version ---
export const arbMetaStoreAnyVersion: fc.Arbitrary<MetaStore> = fc
  .tuple(
    fc.integer({ min: 0, max: 999 }),
    fc.array(fc.tuple(arbFilename, arbPlanMeta), {
      minLength: 0,
      maxLength: 10,
    }),
  )
  .map(([version, entries]) => ({
    version,
    plans: Object.fromEntries(entries) as Record<string, PlanMeta>,
  }));

// --- Partial<PlanMeta> for updates ---
export const arbPartialMeta: fc.Arbitrary<Partial<PlanMeta>> = fc.record(
  {
    status: arbStatus,
    created: arbISOTimestamp,
    updated: arbISOTimestamp,
  },
  { requiredKeys: [] },
);

// --- Plan ---
export const arbPlan: fc.Arbitrary<Plan> = fc.record({
  filename: arbFilename,
  filepath: arbFilename.map((f) => `/tmp/plans/${f}`),
  content: fc.string({ minLength: 0, maxLength: 200 }),
  meta: fc.option(arbPlanMeta, { nil: null }),
});

// --- Stateful test commands ---
export type StoreCommand =
  | { type: "set"; filename: string; status: PlanStatus }
  | { type: "remove"; filename: string }
  | { type: "get"; filename: string };

export const arbCommand: fc.Arbitrary<StoreCommand> = fc.oneof(
  fc.record({
    type: fc.constant("set" as const),
    filename: arbPoolFilename,
    status: arbStatus,
  }),
  fc.record({
    type: fc.constant("remove" as const),
    filename: arbPoolFilename,
  }),
  fc.record({
    type: fc.constant("get" as const),
    filename: arbPoolFilename,
  }),
);
