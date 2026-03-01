import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PlanStatus } from "./frontmatter.js";
import { fileExists } from "../utils/fs.js";

const META_FILENAME = ".ccplan-meta.json";

export type PlanMeta = {
  status: PlanStatus;
  created: string;
  updated: string;
};

export type MetaStore = {
  version: number;
  plans: Record<string, PlanMeta>;
};

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
  const data = JSON.parse(raw) as MetaStore;
  return data;
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
    ? { ...existing, ...updates, updated: now }
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
