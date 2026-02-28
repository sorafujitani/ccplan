import { resolveConfig } from "../core/config.js";
import { scanPlans, resolvePlanFile, getLatestPlan } from "../core/plan.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";

const options = {
  latest: {
    type: "boolean" as const,
    short: "l",
    description: "Open the most recently modified plan",
  },
};

export const openCommand: CommandDef = {
  name: "open",
  description: "Open plan in $EDITOR",
  usage: "ccplan open <file> [--latest]",
  options,
  handler: async (args) => {
    const { values, positionals } = parse(args, options);
    const config = await resolveConfig();

    let plan;
    if (values.latest) {
      plan = await getLatestPlan(config.plansDir);
      if (!plan) {
        console.error("No plans found.");
        process.exitCode = 1;
        return;
      }
    } else {
      if (positionals.length === 0) {
        console.error("Usage: ccplan open <file> or ccplan open --latest");
        process.exitCode = 1;
        return;
      }
      const plans = await scanPlans(config.plansDir);
      plan = resolvePlanFile(plans, positionals[0]);
      if (!plan) {
        console.error(`Plan not found: ${positionals[0]}`);
        process.exitCode = 1;
        return;
      }
    }

    const editor = process.env.EDITOR ?? "vi";
    const proc = Bun.spawn([editor, plan.filepath], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    await proc.exited;
  },
};
