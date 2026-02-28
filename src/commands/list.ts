import { resolveConfig } from "../core/config.js";
import { scanPlans } from "../core/plan.js";
import { formatPlanTable, formatPlanJson } from "../utils/format.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";

const options = {
  status: {
    type: "string" as const,
    short: "s",
    description: "Filter by status (draft|active|done|archived)",
  },
  all: {
    type: "boolean" as const,
    short: "a",
    description: "Include archived plans",
  },
  json: {
    type: "boolean" as const,
    description: "Output as JSON",
  },
};

export const listCommand: CommandDef = {
  name: "list",
  description: "List plans (default command)",
  usage: "ccplan list [--status <status>] [--all] [--json]",
  options,
  handler: async (args) => {
    const { values } = parse(args, options);
    const config = await resolveConfig();
    let plans = await scanPlans(config.plansDir);

    // フィルタ
    if (values.status) {
      plans = plans.filter((p) => p.frontmatter?.status === values.status);
    } else if (!values.all) {
      // デフォルトで archived を除外
      plans = plans.filter((p) => p.frontmatter?.status !== "archived");
    }

    // updated 降順ソート
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
