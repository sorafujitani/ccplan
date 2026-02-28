import { resolveConfig } from "../core/config.js";
import { scanPlans, resolvePlanFile } from "../core/plan.js";
import { formatPlanDetail, formatPlanJson } from "../utils/format.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";

const options = {
  json: {
    type: "boolean" as const,
    description: "Output as JSON",
  },
};

export const showCommand: CommandDef = {
  name: "show",
  description: "Show plan details",
  usage: "ccplan show <file> [--json]",
  options,
  handler: async (args) => {
    const { values, positionals } = parse(args, options);

    if (positionals.length === 0) {
      console.error("Usage: ccplan show <file>");
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

    if (values.json) {
      console.log(formatPlanJson([plan]));
    } else {
      console.log(formatPlanDetail(plan));
    }
  },
};
