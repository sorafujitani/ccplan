import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createEmptyStore,
  createDefaultMeta,
  readMetaStore,
  writeMetaStore,
  getMeta,
  setMeta,
  removeMeta,
} from "../../src/core/metastore.js";
import type { MetaStore, PlanMeta } from "../../src/core/metastore.js";
import type { PlanStatus } from "../../src/core/frontmatter.js";
import {
  arbMetaStore,
  arbMetaStoreAnyVersion,
  arbFilename,
  arbPlanMeta,
  arbStatus,
  arbPartialMeta,
  arbCommand,
  type StoreCommand,
} from "./generators.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "ccplan-pbt-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

describe("MetaStore Property-Based Tests", () => {
  // =========================================================================
  // P1: Round-trip — writeMetaStore then readMetaStore
  // =========================================================================
  describe("P1: writeMetaStore ↔ readMetaStore round-trip", () => {
    it("∀ store: read(write(store)) === store", async () => {
      await fc.assert(
        fc.asyncProperty(arbMetaStore, async (store) => {
          await writeMetaStore(tmpDir, store);
          const loaded = await readMetaStore(tmpDir);
          expect(loaded).toEqual(store);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P2: Algebraic — setMeta then getMeta retrieves the status
  // =========================================================================
  describe("P2: setMeta → getMeta retrieves status", () => {
    it("∀ store, key, status: getMeta(setMeta(store, key, {status}), key).status === status", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, arbStatus, (store, filename, status) => {
          const result = setMeta(store, filename, { status });
          const meta = getMeta(result, filename);
          expect(meta).not.toBeNull();
          expect(meta!.status).toBe(status);
        }),
        { numRuns: 200 },
      );
    });
  });

  // =========================================================================
  // P3: Invariant — setMeta always produces valid ISO updated timestamp
  // =========================================================================
  describe("P3: setMeta produces valid updated timestamp", () => {
    it("∀ store, key, updates: updated is a valid ISO timestamp", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, arbPartialMeta, (store, filename, updates) => {
          const before = Date.now();
          const result = setMeta(store, filename, updates);
          const after = Date.now();
          const meta = result.plans[filename];
          expect(meta).toBeDefined();
          const updatedMs = new Date(meta.updated).getTime();
          expect(updatedMs).toBeGreaterThanOrEqual(before);
          expect(updatedMs).toBeLessThanOrEqual(after);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P4: Invariant — setMeta preserves created on existing entries
  // =========================================================================
  describe("P4: setMeta preserves created on existing entries", () => {
    it("∀ existing entry, updates: created is unchanged after setMeta", () => {
      // Generate a store that always has at least one entry, then pick a key from it
      const arbStoreWithKey = arbPlanMeta.chain((meta) =>
        arbFilename.chain((filename) =>
          arbMetaStore.map((baseStore) => {
            const store = { ...baseStore, plans: { ...baseStore.plans, [filename]: meta } };
            return { store, filename };
          }),
        ),
      );

      fc.assert(
        fc.property(arbStoreWithKey, arbPartialMeta, ({ store, filename }, updates) => {
          const originalCreated = store.plans[filename].created;
          const result = setMeta(store, filename, updates);
          expect(result.plans[filename].created).toBe(originalCreated);
        }),
        { numRuns: 200 },
      );
    });
  });

  // =========================================================================
  // P5: Invariant — setMeta on new entry: created === updated
  // =========================================================================
  describe("P5: setMeta on new entry forces created === updated", () => {
    it("∀ new entry: created and updated are identical", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, arbPartialMeta, (store, filename, updates) => {
          // Precondition: filename must NOT exist in store
          fc.pre(!(filename in store.plans));
          const result = setMeta(store, filename, updates);
          const meta = result.plans[filename];
          expect(meta.created).toBe(meta.updated);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P6: Invariant — setMeta does not mutate original store
  // =========================================================================
  describe("P6: setMeta immutability", () => {
    it("∀ store, key, updates: original store is unchanged", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, arbPartialMeta, (store, filename, updates) => {
          const original = deepClone(store);
          setMeta(store, filename, updates);
          expect(store).toEqual(original);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P7: Invariant — removeMeta does not mutate original store
  // =========================================================================
  describe("P7: removeMeta immutability", () => {
    it("∀ store, key: original store is unchanged", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, (store, filename) => {
          const original = deepClone(store);
          removeMeta(store, filename);
          expect(store).toEqual(original);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P8: Algebraic — removeMeta then getMeta returns null
  // =========================================================================
  describe("P8: removeMeta → getMeta returns null", () => {
    it("∀ store, key: getMeta(removeMeta(store, key), key) === null", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, (store, filename) => {
          const result = removeMeta(store, filename);
          expect(getMeta(result, filename)).toBeNull();
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P9: Idempotent — removeMeta is idempotent
  // =========================================================================
  describe("P9: removeMeta idempotency", () => {
    it("removeMeta(removeMeta(s, k), k) === removeMeta(s, k)", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, (store, filename) => {
          const once = removeMeta(store, filename);
          const twice = removeMeta(once, filename);
          expect(twice).toEqual(once);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P10: Algebraic — removeMeta undoes setMeta for new keys
  // =========================================================================
  describe("P10: set then remove on new key restores original store", () => {
    it("∀ new key: removeMeta(setMeta(store, key, updates), key) === store", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, arbPartialMeta, (store, filename, updates) => {
          fc.pre(!(filename in store.plans));
          const added = setMeta(store, filename, updates);
          const removed = removeMeta(added, filename);
          expect(removed).toEqual(store);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P11: Invariant — setMeta preserves all other entries
  // =========================================================================
  describe("P11: setMeta preserves other entries", () => {
    it("∀ store, key: all other keys are unchanged", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, arbPartialMeta, (store, filename, updates) => {
          const result = setMeta(store, filename, updates);
          for (const key of Object.keys(store.plans)) {
            if (key !== filename) {
              expect(getMeta(result, key)).toEqual(getMeta(store, key));
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P12: Invariant — removeMeta preserves all other entries
  // =========================================================================
  describe("P12: removeMeta preserves other entries", () => {
    it("∀ store, key: all other keys are unchanged", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, (store, filename) => {
          const result = removeMeta(store, filename);
          for (const key of Object.keys(store.plans)) {
            if (key !== filename) {
              expect(getMeta(result, key)).toEqual(getMeta(store, key));
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P19: Stateful model-based test — sequence of set/remove/get
  // =========================================================================
  describe("P19: stateful model-based test", () => {
    it("random command sequences: MetaStore matches Map model", () => {
      fc.assert(
        fc.property(
          fc.array(arbCommand, { minLength: 1, maxLength: 50 }),
          (commands: StoreCommand[]) => {
            let store = createEmptyStore();
            const model = new Map<string, PlanStatus>();

            for (const cmd of commands) {
              switch (cmd.type) {
                case "set":
                  store = setMeta(store, cmd.filename, { status: cmd.status });
                  model.set(cmd.filename, cmd.status);
                  break;
                case "remove":
                  store = removeMeta(store, cmd.filename);
                  model.delete(cmd.filename);
                  break;
                case "get": {
                  const meta = getMeta(store, cmd.filename);
                  const expected = model.get(cmd.filename);
                  if (expected === undefined) {
                    expect(meta).toBeNull();
                  } else {
                    expect(meta).not.toBeNull();
                    expect(meta!.status).toBe(expected);
                  }
                  break;
                }
              }
            }

            // Final check: all keys match
            for (const [key, status] of model) {
              const meta = getMeta(store, key);
              expect(meta).not.toBeNull();
              expect(meta!.status).toBe(status);
            }
            for (const key of Object.keys(store.plans)) {
              expect(model.has(key)).toBe(true);
            }
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  // =========================================================================
  // P24: Algebraic — last write wins on same key
  // =========================================================================
  describe("P24: last write wins on same key", () => {
    it("∀ store, key, s1, s2: setMeta(setMeta(store, key, {status:s1}), key, {status:s2}).status === s2", () => {
      fc.assert(
        fc.property(arbMetaStore, arbFilename, arbStatus, arbStatus, (store, filename, s1, s2) => {
          const result = setMeta(setMeta(store, filename, { status: s1 }), filename, { status: s2 });
          expect(result.plans[filename].status).toBe(s2);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // P27: Invariant — version is preserved through set/remove
  // =========================================================================
  describe("P27: version preserved through operations", () => {
    it("∀ store: setMeta and removeMeta preserve version", () => {
      fc.assert(
        fc.property(arbMetaStoreAnyVersion, arbFilename, arbPartialMeta, (store, filename, updates) => {
          const afterSet = setMeta(store, filename, updates);
          expect(afterSet.version).toBe(store.version);

          const afterRemove = removeMeta(store, filename);
          expect(afterRemove.version).toBe(store.version);
        }),
        { numRuns: 100 },
      );
    });
  });
});
