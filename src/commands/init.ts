import { readFile, writeFile } from "node:fs/promises";
import { resolveConfig } from "../core/config.js";
import { scanPlans, resolvePlanFile } from "../core/plan.js";
import {
  parsePlan,
  serializePlan,
  createDefaultFrontmatter,
} from "../core/frontmatter.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";
import chalk from "chalk";

const options = {
  force: {
    type: "boolean" as const,
    short: "f",
    description: "Re-initialize existing frontmatter",
  },
};

export const initCommand: CommandDef = {
  name: "init",
  description: "Add frontmatter to plan files",
  usage: "ccplan init [file] [--force]",
  options,
  handler: async (args) => {
    const { values, positionals } = parse(args, options);
    const config = await resolveConfig();
    const plans = await scanPlans(config.plansDir);

    let targets = plans;
    if (positionals.length > 0) {
      const plan = resolvePlanFile(plans, positionals[0]);
      if (!plan) {
        console.error(`Plan not found: ${positionals[0]}`);
        process.exitCode = 1;
        return;
      }
      targets = [plan];
    } else {
      // 引数なし: frontmatter なしのファイルのみ (--force なら全て)
      if (!values.force) {
        targets = plans.filter((p) => !p.hasFrontmatter);
      }
    }

    if (targets.length === 0) {
      console.log(chalk.dim("No plans to initialize."));
      return;
    }

    let count = 0;
    for (const plan of targets) {
      const raw = await readFile(plan.filepath, "utf-8");

      if (plan.hasFrontmatter && !values.force) {
        console.log(chalk.dim(`  skip ${plan.filename} (already initialized)`));
        continue;
      }

      const defaults = createDefaultFrontmatter();
      const updated = serializePlan(raw, defaults);
      await writeFile(plan.filepath, updated, "utf-8");
      console.log(`${chalk.green("✓")} ${plan.filename}`);
      count++;
    }

    console.log(chalk.dim(`\nInitialized ${count} plan(s).`));
  },
};
