import { readFile, writeFile } from "node:fs/promises";
import { resolveConfig } from "../core/config.js";
import { scanPlans, resolvePlanFile } from "../core/plan.js";
import { serializePlan, createDefaultFrontmatter } from "../core/frontmatter.js";
import { getCurrentBranch, branchExists } from "../core/git.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";
import chalk from "chalk";

const options = {
  branch: {
    type: "string" as const,
    short: "b",
    description: "Branch name (default: current branch)",
  },
};

export const linkCommand: CommandDef = {
  name: "link",
  description: "Link plan to a git branch",
  usage: "ccplan link <file> [--branch <branch>]",
  options,
  handler: async (args) => {
    const { values, positionals } = parse(args, options);

    if (positionals.length === 0) {
      console.error("Usage: ccplan link <file> [--branch <branch>]");
      process.exitCode = 1;
      return;
    }

    const branch = values.branch ?? (await getCurrentBranch());

    if (!(await branchExists(branch))) {
      console.error(`Branch not found: ${branch}`);
      process.exitCode = 1;
      return;
    }

    const config = await resolveConfig();
    const plans = await scanPlans(config.plansDir);
    const plan = resolvePlanFile(plans, positionals[0]);

    if (!plan) {
      console.error(`Plan not found: ${positionals[0]}`);
      process.exitCode = 1;
      return;
    }

    const raw = await readFile(plan.filepath, "utf-8");

    let updated: string;
    if (!plan.hasFrontmatter) {
      const defaults = createDefaultFrontmatter();
      defaults.branch = branch;
      updated = serializePlan(raw, defaults);
    } else {
      updated = serializePlan(raw, { branch });
    }

    await writeFile(plan.filepath, updated, "utf-8");
    console.log(
      `${chalk.green("✓")} ${plan.filename} → ${chalk.cyan(branch)}`,
    );
  },
};
