import chalk from "chalk";
import type { Plan } from "../core/plan.js";
import type { PlanStatus } from "../core/frontmatter.js";

export function colorStatus(status: PlanStatus): string {
  switch (status) {
    case "draft":
      return chalk.yellow(status);
    case "active":
      return chalk.blue(status);
    case "done":
      return chalk.green(status);
  }
}

export function formatPlanTable(plans: Plan[]): string {
  if (plans.length === 0) {
    return chalk.dim("No plans found.");
  }

  const lines: string[] = [];
  for (const plan of plans) {
    const status = plan.meta
      ? colorStatus(plan.meta.status)
      : chalk.yellow("no-meta");
    const updated = plan.meta?.updated
      ? chalk.dim(` ${formatRelativeDate(plan.meta.updated)}`)
      : "";
    lines.push(`  ${status.padEnd(20)} ${plan.filename}${updated}`);
  }

  return lines.join("\n");
}

export function formatPlanJson(plans: Plan[]): string {
  const data = plans.map((p) => ({
    filename: p.filename,
    filepath: p.filepath,
    hasMeta: p.meta !== null,
    status: p.meta?.status ?? null,
    created: p.meta?.created ?? null,
    updated: p.meta?.updated ?? null,
  }));
  return JSON.stringify(data, null, 2);
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
