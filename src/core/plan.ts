import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { parsePlan } from "./frontmatter.js";
import type { CcplanFrontmatter } from "./frontmatter.js";

export type PlanWithFrontmatter = {
  filename: string;
  filepath: string;
  frontmatter: CcplanFrontmatter;
  content: string;
  hasFrontmatter: true;
};

export type PlanWithoutFrontmatter = {
  filename: string;
  filepath: string;
  frontmatter: null;
  content: string;
  hasFrontmatter: false;
};

export type Plan = PlanWithFrontmatter | PlanWithoutFrontmatter;

export type ResolvePlanResult =
  | { ok: true; plan: Plan }
  | { ok: false; error: string };

export async function scanPlans(plansDir: string): Promise<Plan[]> {
  const entries = await readdir(plansDir);
  const mdFiles = entries.filter((f) => f.endsWith(".md"));

  return Promise.all(mdFiles.map((file) => readPlan(join(plansDir, file))));
}

export async function readPlan(filepath: string): Promise<Plan> {
  const raw = await readFile(filepath, "utf-8");
  const parsed = parsePlan(raw);
  const filename = basename(filepath);

  if (parsed.frontmatter !== null) {
    return {
      filename,
      filepath,
      frontmatter: parsed.frontmatter,
      content: parsed.content,
      hasFrontmatter: true,
    };
  }

  return {
    filename,
    filepath,
    frontmatter: null,
    content: parsed.content,
    hasFrontmatter: false,
  };
}

export async function writePlan(
  filepath: string,
  content: string,
): Promise<void> {
  await writeFile(filepath, content, "utf-8");
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

  const plans = await scanPlans(plansDir);
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
