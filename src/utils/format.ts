import chalk from "chalk";
import type { Plan } from "../core/plan.js";
import type { PlanStatus } from "../core/frontmatter.js";

export function colorStatus(status: PlanStatus): string {
  switch (status) {
    case "draft":
      return chalk.gray(status);
    case "active":
      return chalk.blue(status);
    case "done":
      return chalk.green(status);
    case "archived":
      return chalk.dim(status);
  }
}

export function formatPlanTable(plans: Plan[]): string {
  if (plans.length === 0) {
    return chalk.dim("No plans found.");
  }

  const lines: string[] = [];
  for (const plan of plans) {
    const status = plan.frontmatter
      ? colorStatus(plan.frontmatter.status)
      : chalk.yellow("no-meta");
    const branch = plan.frontmatter?.branch
      ? chalk.cyan(` [${plan.frontmatter.branch}]`)
      : "";
    const updated = plan.frontmatter?.updated
      ? chalk.dim(` ${formatRelativeDate(plan.frontmatter.updated)}`)
      : "";
    lines.push(`  ${status.padEnd(20)} ${plan.filename}${branch}${updated}`);
  }

  return lines.join("\n");
}

export function formatPlanDetail(plan: Plan): string {
  const lines: string[] = [];

  lines.push(chalk.bold(plan.filename));
  lines.push("");

  if (plan.frontmatter) {
    lines.push(`  Status:  ${colorStatus(plan.frontmatter.status)}`);
    if (plan.frontmatter.branch) {
      lines.push(`  Branch:  ${chalk.cyan(plan.frontmatter.branch)}`);
    }
    lines.push(`  Created: ${plan.frontmatter.created}`);
    lines.push(`  Updated: ${plan.frontmatter.updated}`);
  } else {
    lines.push(chalk.yellow("  No ccplan metadata"));
  }

  lines.push("");
  lines.push(plan.content);

  return lines.join("\n");
}

export function formatPlanJson(plans: Plan[]): string {
  const data = plans.map((p) => ({
    filename: p.filename,
    filepath: p.filepath,
    hasFrontmatter: p.hasFrontmatter,
    ...p.frontmatter,
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
