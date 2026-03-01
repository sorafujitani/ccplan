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
      const usage = values.latest
        ? "ccplan status --latest <status>"
        : positionals.length === 0
          ? "ccplan status <file> <status>"
          : "Missing <status> argument.";
      console.error(
        `Usage: ${usage}\nValid statuses: ${VALID_STATUSES.join(", ")}`,
      );
      process.exitCode = 1;
      return;
    }

    if (!isValidStatus(newStatus)) {
      console.error(
        `Invalid status: ${newStatus}\nValid statuses: ${VALID_STATUSES.join(", ")}`,
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
      console.error(result.error);
      process.exitCode = 1;
      return;
    }

    const { plan } = result;
    const store = await readMetaStore(config.plansDir);
    const oldMeta = getMeta(store, plan.filename);
    const oldStatus = oldMeta?.status ?? "none";

    const updatedStore = setMeta(store, plan.filename, { status: newStatus });
    await writeMetaStore(config.plansDir, updatedStore);

    console.log(
      `${chalk.green("✓")} ${plan.filename}: ${oldStatus} → ${newStatus}`,
    );
  },
};
