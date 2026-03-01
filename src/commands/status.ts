import { resolveConfig } from "../core/config.js";
import { resolveSinglePlan } from "../core/plan.js";
import {
  readMetaStore,
  writeMetaStore,
  getMeta,
  setMeta,
} from "../core/metastore.js";
import { isValidStatus, VALID_STATUSES } from "../core/frontmatter.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";
import chalk from "chalk";

const options = {
  latest: {
    type: "boolean",
    short: "l",
    description: "Target the most recently modified plan",
  },
} as const satisfies import("../cli/args.js").OptionDefs;

export const statusCommand: CommandDef = {
  name: "status",
  description: "Change plan status",
  usage: "ccplan status <file> <status> or ccplan status --latest <status>",
  options,
  handler: async (args) => {
    const { values, positionals } = parse(args, options);

    const newStatus = values.latest ? positionals[0] : positionals[1];
    if (!newStatus) {
      if (values.latest) {
        console.error(
          `Missing status. Usage: ccplan status --latest <status>`,
        );
      } else if (positionals.length === 0) {
        console.error(`Missing file and status. Usage: ccplan status <file> <status>`);
      } else {
        console.error(`Missing status for ${positionals[0]}. Usage: ccplan status <file> <status>`);
      }
      console.error(`Valid statuses: ${VALID_STATUSES.join(", ")}`);
      process.exitCode = 1;
      return;
    }

    if (!isValidStatus(newStatus)) {
      console.error(
        `Invalid status "${newStatus}". Valid statuses: ${VALID_STATUSES.join(", ")}`,
      );
      process.exitCode = 1;
      return;
    }

    const config = await resolveConfig();
    const result = await resolveSinglePlan(
      config.plansDir,
      positionals[0],
      !!values.latest,
    );
    if (!result.ok) {
      console.error(`${result.error} Run 'ccplan list' to see available plans.`);
      process.exitCode = 1;
      return;
    }

    const { plan } = result;
    const store = await readMetaStore(config.plansDir);
    const oldMeta = getMeta(store, plan.filename);
    const oldStatus = oldMeta?.status ?? "(unset)";

    const updatedStore = setMeta(store, plan.filename, { status: newStatus });
    await writeMetaStore(config.plansDir, updatedStore);

    console.log(
      `${chalk.green("✓")} ${plan.filename}: ${oldStatus} → ${newStatus}`,
    );
  },
};
