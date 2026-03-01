import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import {
  readMetaStore,
  writeMetaStore,
  getMeta,
  createDefaultMeta,
} from "./metastore.js";
import type { PlanMeta } from "./metastore.js";

export type Plan = {
  filename: string;
  filepath: string;
  content: string;
  meta: PlanMeta | null;
};

export type ResolvePlanResult =
  | { ok: true; plan: Plan }
  | { ok: false; error: string };

export async function scanPlans(plansDir: string): Promise<Plan[]> {
  const entries = await readdir(plansDir);
  const mdFiles = entries.filter((f) => f.endsWith(".md"));

  return Promise.all(mdFiles.map((file) => readPlan(join(plansDir, file))));
}

export async function scanPlansWithMeta(plansDir: string): Promise<Plan[]> {
  const plans = await scanPlans(plansDir);
  const store = await readMetaStore(plansDir);

  let dirty = false;
  for (const plan of plans) {
    const meta = getMeta(store, plan.filename);
    if (meta) {
      plan.meta = meta;
    } else {
      const defaultMeta = createDefaultMeta();
      plan.meta = defaultMeta;
      store.plans[plan.filename] = defaultMeta;
      dirty = true;
    }
  }

  if (dirty) {
    await writeMetaStore(plansDir, store);
  }

  return plans;
}

export async function readPlan(filepath: string): Promise<Plan> {
  const raw = await readFile(filepath, "utf-8");
  const filename = basename(filepath);

  return {
    filename,
    filepath,
    content: raw,
    meta: null,
  };
}

export function resolvePlanFile(
  plans: Plan[],
  ref: string,
): Plan | undefined {
  const name = basename(ref);

  const exact = plans.find((p) => p.filename === name);
  if (exact) return exact;

  const withExt = plans.find((p) => p.filename === `${name}.md`);
  if (withExt) return withExt;

  return undefined;
}

export async function resolveSinglePlan(
  plansDir: string,
  ref: string | undefined,
  useLatest: boolean,
): Promise<ResolvePlanResult> {
  if (useLatest) {
    const plan = await getLatestPlan(plansDir);
    if (!plan) return { ok: false, error: "No plans found." };
    return { ok: true, plan };
  }

  if (!ref) {
    return { ok: false, error: "No plan file specified." };
  }

  const plans = await scanPlansWithMeta(plansDir);
  const plan = resolvePlanFile(plans, ref);
  if (!plan) return { ok: false, error: `Plan not found: ${ref}` };
  return { ok: true, plan };
}

export async function getLatestPlan(
  plansDir: string,
): Promise<Plan | undefined> {
  const entries = await readdir(plansDir);
  const mdFiles = entries.filter((f) => f.endsWith(".md"));

  if (mdFiles.length === 0) return undefined;

  const stats = await Promise.all(
    mdFiles.map(async (file) => {
      const filepath = join(plansDir, file);
      const s = await stat(filepath);
      return { filepath, mtime: s.mtimeMs };
    }),
  );

  const latest = stats.reduce((a, b) => (b.mtime > a.mtime ? b : a));
  return readPlan(latest.filepath);
}
