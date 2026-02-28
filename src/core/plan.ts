import { readdir, readFile, writeFile } from "node:fs/promises";
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
  // 完全一致
  const exact = plans.find((p) => p.filename === ref);
  if (exact) return exact;

  // .md 付きで完全一致
  const withExt = plans.find((p) => p.filename === `${ref}.md`);
  if (withExt) return withExt;

  // prefix 一致
  const prefix = plans.filter((p) => p.filename.startsWith(ref));
  if (prefix.length === 1) return prefix[0];

  // substring 一致
  const substring = plans.filter((p) => p.filename.includes(ref));
  if (substring.length === 1) return substring[0];

  return undefined;
}
