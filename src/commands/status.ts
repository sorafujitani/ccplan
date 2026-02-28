import { readFile, writeFile } from "node:fs/promises";
import { resolveConfig } from "../core/config.js";
import { scanPlans, resolvePlanFile } from "../core/plan.js";
import {
  isValidStatus,
  serializePlan,
  createDefaultFrontmatter,
  VALID_STATUSES,
} from "../core/frontmatter.js";
import type { PlanStatus } from "../core/frontmatter.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";
import chalk from "chalk";

export const statusCommand: CommandDef = {
  name: "status",
  description: "Change plan status",
  usage: "ccplan status <file> <status>",
  handler: async (args) => {
    const { positionals } = parse(args, {});

    if (positionals.length < 2) {
      console.error(
        `Usage: ccplan status <file> <status>\nValid statuses: ${VALID_STATUSES.join(", ")}`,
      );
      process.exitCode = 1;
      return;
    }

    const [ref, newStatus] = positionals;

    if (!isValidStatus(newStatus)) {
      console.error(
        `Invalid status: ${newStatus}\nValid statuses: ${VALID_STATUSES.join(", ")}`,
      );
      process.exitCode = 1;
      return;
    }

    const config = await resolveConfig();
    const plans = await scanPlans(config.plansDir);
    const plan = resolvePlanFile(plans, ref);

    if (!plan) {
      console.error(`Plan not found: ${ref}`);
      process.exitCode = 1;
      return;
    }

    const raw = await readFile(plan.filepath, "utf-8");
    const oldStatus = plan.frontmatter?.status ?? "none";

    let updated: string;
    if (!plan.hasFrontmatter) {
      // frontmatter なしなら自動付与
      const defaults = createDefaultFrontmatter();
      defaults.status = newStatus as PlanStatus;
      updated = serializePlan(raw, defaults);
    } else {
      updated = serializePlan(raw, { status: newStatus as PlanStatus });
    }

    await writeFile(plan.filepath, updated, "utf-8");
    console.log(
      `${chalk.green("✓")} ${plan.filename}: ${oldStatus} → ${newStatus}`,
    );
  },
};
