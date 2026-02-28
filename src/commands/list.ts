import { resolveConfig } from "../core/config.js";
import { scanPlans } from "../core/plan.js";
import { formatPlanTable, formatPlanJson } from "../utils/format.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";

const options = {
  status: {
    type: "string",
    short: "s",
    description: "Filter by status (draft|active|done)",
  },
  json: {
    type: "boolean",
    description: "Output as JSON",
  },
} as const satisfies import("../cli/args.js").OptionDefs;

export const listCommand: CommandDef = {
  name: "list",
  description: "List plans",
  usage: "ccplan list [--status <status>] [--json]",
  options,
  handler: async (args) => {
    const { values } = parse(args, options);
    const config = await resolveConfig();
    let plans = await scanPlans(config.plansDir);

    if (values.status) {
      plans = plans.filter((p) => p.frontmatter?.status === values.status);
    }

    plans.sort((a, b) => {
      const aDate = a.frontmatter?.updated ?? "";
      const bDate = b.frontmatter?.updated ?? "";
      return bDate.localeCompare(aDate);
    });

    if (values.json) {
      console.log(formatPlanJson(plans));
    } else {
      console.log(formatPlanTable(plans));
    }
  },
};
