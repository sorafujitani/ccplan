import { readFile, writeFile } from "node:fs/promises";
import { resolveConfig } from "../core/config.js";
import { scanPlans, resolvePlanFile, getLatestPlan } from "../core/plan.js";
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

const options = {
  latest: {
    type: "boolean" as const,
    short: "l",
    description: "Target the most recently modified plan",
  },
};

export const statusCommand: CommandDef = {
  name: "status",
  description: "Change plan status",
  usage: "ccplan status <file> <status> or ccplan status --latest <status>",
  options,
  handler: async (args) => {
    const { values, positionals } = parse(args, options);
    const config = await resolveConfig();

    let plan;
    let newStatus: string;

    if (values.latest) {
      if (positionals.length < 1) {
        console.error(
          `Usage: ccplan status --latest <status>\nValid statuses: ${VALID_STATUSES.join(", ")}`,
        );
        process.exitCode = 1;
        return;
      }
      newStatus = positionals[0];
      plan = await getLatestPlan(config.plansDir);
      if (!plan) {
        console.error("No plans found.");
        process.exitCode = 1;
        return;
      }
    } else {
      if (positionals.length === 0) {
        console.error(
          `Usage: ccplan status <file> <status>\nValid statuses: ${VALID_STATUSES.join(", ")}`,
        );
        process.exitCode = 1;
        return;
      }
      if (positionals.length === 1) {
        console.error(
          `Missing <status> argument.\nValid statuses: ${VALID_STATUSES.join(", ")}`,
        );
        process.exitCode = 1;
        return;
      }
      newStatus = positionals[1];
      const plans = await scanPlans(config.plansDir);
      plan = resolvePlanFile(plans, positionals[0]);
      if (!plan) {
        console.error(`Plan not found: ${positionals[0]}`);
        process.exitCode = 1;
        return;
      }
    }

    if (!isValidStatus(newStatus)) {
      console.error(
        `Invalid status: ${newStatus}\nValid statuses: ${VALID_STATUSES.join(", ")}`,
      );
      process.exitCode = 1;
      return;
    }

    const raw = await readFile(plan.filepath, "utf-8");
    const oldStatus = plan.frontmatter?.status ?? "none";

    let updated: string;
    if (!plan.hasFrontmatter) {
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
