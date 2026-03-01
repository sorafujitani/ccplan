import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as v from "valibot";
import { VALID_STATUSES } from "./frontmatter.js";
import { fileExists } from "../utils/fs.js";

const META_FILENAME = ".ccplan-meta.json";

const PlanMetaSchema = v.object({
  status: v.picklist([...VALID_STATUSES]),
  created: v.string(),
  updated: v.string(),
});

const MetaStoreSchema = v.object({
  version: v.number(),
  plans: v.record(v.string(), PlanMetaSchema),
});

export type PlanMeta = v.InferOutput<typeof PlanMetaSchema>;
export type MetaStore = v.InferOutput<typeof MetaStoreSchema>;

export function createEmptyStore(): MetaStore {
  return { version: 1, plans: {} };
}

export function createDefaultMeta(): PlanMeta {
  const now = new Date().toISOString();
  return {
    status: "active",
    created: now,
    updated: now,
  };
}

export async function readMetaStore(plansDir: string): Promise<MetaStore> {
  const metaPath = join(plansDir, META_FILENAME);

  if (!(await fileExists(metaPath))) {
    return createEmptyStore();
  }

  const raw = await readFile(metaPath, "utf-8");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error(`Warning: corrupted ${META_FILENAME}, resetting.`);
    return createEmptyStore();
  }

  const result = v.safeParse(MetaStoreSchema, json);
  if (!result.success) {
    console.error(`Warning: invalid ${META_FILENAME} schema, resetting.`);
    return createEmptyStore();
  }
  return result.output;
}

export async function writeMetaStore(
  plansDir: string,
  store: MetaStore,
): Promise<void> {
  const metaPath = join(plansDir, META_FILENAME);
  await writeFile(metaPath, JSON.stringify(store, null, 2) + "\n", "utf-8");
}

export function getMeta(
  store: MetaStore,
  filename: string,
): PlanMeta | null {
  return store.plans[filename] ?? null;
}

export function setMeta(
  store: MetaStore,
  filename: string,
  updates: Partial<PlanMeta>,
): MetaStore {
  const existing = store.plans[filename];
  const now = new Date().toISOString();

  const merged: PlanMeta = existing
    ? { ...existing, ...updates, created: existing.created, updated: now }
    : { ...createDefaultMeta(), ...updates, created: now, updated: now };

  return {
    ...store,
    plans: { ...store.plans, [filename]: merged },
  };
}

export function removeMeta(
  store: MetaStore,
  filename: string,
): MetaStore {
  const { [filename]: _, ...rest } = store.plans;
  return { ...store, plans: rest };
}
