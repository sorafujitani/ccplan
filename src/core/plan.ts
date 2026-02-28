import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { parsePlan } from "./frontmatter.js";
import type { CcplanFrontmatter } from "./frontmatter.js";

export type Plan = {
  filename: string;
  filepath: string;
  frontmatter: CcplanFrontmatter | null;
  content: string;
  hasFrontmatter: boolean;
};

export async function scanPlans(plansDir: string): Promise<Plan[]> {
  const entries = await readdir(plansDir);
  const mdFiles = entries.filter((f) => f.endsWith(".md"));

  const plans: Plan[] = [];
  for (const file of mdFiles) {
    const filepath = join(plansDir, file);
    const plan = await readPlan(filepath);
    plans.push(plan);
  }

  return plans;
}

export async function readPlan(filepath: string): Promise<Plan> {
  const raw = await readFile(filepath, "utf-8");
  const parsed = parsePlan(raw);

  return {
    filename: basename(filepath),
    filepath,
    frontmatter: parsed.frontmatter,
    content: parsed.content,
    hasFrontmatter: parsed.frontmatter !== null,
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

export async function getLatestPlan(
  plansDir: string,
): Promise<Plan | undefined> {
  const entries = await readdir(plansDir);
  const mdFiles = entries.filter((f) => f.endsWith(".md"));

  if (mdFiles.length === 0) return undefined;

  let latest: { filepath: string; mtime: number } | null = null;
  for (const file of mdFiles) {
    const filepath = join(plansDir, file);
    const s = await stat(filepath);
    if (!latest || s.mtimeMs > latest.mtime) {
      latest = { filepath, mtime: s.mtimeMs };
    }
  }

  if (!latest) return undefined;
  return readPlan(latest.filepath);
}
