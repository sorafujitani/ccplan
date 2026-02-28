import { readFile, writeFile } from "node:fs/promises";
import { resolveConfig } from "../core/config.js";
import { scanPlans } from "../core/plan.js";
import { serializePlan } from "../core/frontmatter.js";
import { parse } from "../cli/args.js";
import { confirm } from "../utils/prompt.js";
import type { CommandDef } from "../cli/router.js";
import chalk from "chalk";

const options = {
  days: {
    type: "string" as const,
    short: "d",
    description: "Minimum days since updated (default: 30)",
  },
  "dry-run": {
    type: "boolean" as const,
    description: "Preview without changes",
  },
  force: {
    type: "boolean" as const,
    short: "f",
    description: "Skip confirmation",
  },
};

export const cleanCommand: CommandDef = {
  name: "clean",
  description: "Archive done plans",
  usage: "ccplan clean [--days <n>] [--dry-run] [--force]",
  options,
  handler: async (args) => {
    const { values } = parse(args, options);
    const minDays = values.days ? parseInt(values.days, 10) : 30;
    const dryRun = values["dry-run"] as boolean | undefined;

    const config = await resolveConfig();
    const plans = await scanPlans(config.plansDir);

    const now = new Date();
    const targets = plans.filter((p) => {
      if (p.frontmatter?.status !== "done") return false;
      if (!p.frontmatter.updated) return true;
      const updated = new Date(p.frontmatter.updated);
      const diffDays =
        (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= minDays;
    });

    if (targets.length === 0) {
      console.log(chalk.dim("No plans to archive."));
      return;
    }

    console.log(`Found ${targets.length} plan(s) to archive:`);
    for (const plan of targets) {
      console.log(`  ${plan.filename}`);
    }

    if (dryRun) {
      console.log(chalk.dim("\n(dry run — no changes made)"));
      return;
    }

    if (!values.force) {
      const ok = await confirm("\nArchive these plans?");
      if (!ok) {
        console.log(chalk.dim("Cancelled."));
        return;
      }
    }

    for (const plan of targets) {
      const raw = await readFile(plan.filepath, "utf-8");
      const updated = serializePlan(raw, { status: "archived" });
      await writeFile(plan.filepath, updated, "utf-8");
      console.log(`${chalk.green("✓")} ${plan.filename}: done → archived`);
    }
  },
};
