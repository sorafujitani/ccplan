import {
  readMetaStore,
  writeMetaStore,
  getMeta,
  setMeta,
} from "../core/metastore.js";
import { isValidStatus, VALID_STATUSES } from "../core/frontmatter.js";
import { colorStatus } from "../utils/format.js";
import { resolveTargetPlan } from "./_shared.js";
import { resolveConfig } from "../core/config.js";
import { scanPlansWithMeta } from "../core/plan.js";
import { selectPlans } from "../utils/prompt.js";
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
  usage: "ccplan status [file] <status> or ccplan status --latest <status>",
  options,
  handler: async (args) => {
    const { values, positionals } = parse(args, options);

    let fileRef: string | undefined;
    let newStatus: string | undefined;

    if (values.latest) {
      newStatus = positionals[0];
    } else if (positionals.length >= 2) {
      fileRef = positionals[0];
      newStatus = positionals[1];
    } else if (positionals.length === 1) {
      if (isValidStatus(positionals[0])) {
        newStatus = positionals[0];
      } else {
        fileRef = positionals[0];
      }
    }

    if (!newStatus) {
      if (fileRef) {
        console.error(`Missing status for ${fileRef}. Usage: ccplan status <file> <status>`);
      } else {
        console.error(`Missing status. Usage: ccplan status [file] <status>`);
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

    // Interactive multi-select when no file ref and no --latest
    if (!fileRef && !values.latest) {
      if (!process.stdout.isTTY) {
        console.error("No plan file specified. Run 'ccplan list' to see available plans.");
        process.exitCode = 1;
        return;
      }

      const config = await resolveConfig();
      const plans = await scanPlansWithMeta(config.plansDir);

      if (plans.length === 0) {
        console.error("No plans found.");
        process.exitCode = 1;
        return;
      }

      plans.sort((a, b) => {
        const aDate = a.meta?.updated ?? "";
        const bDate = b.meta?.updated ?? "";
        return bDate.localeCompare(aDate);
      });

      const selected = await selectPlans(plans);
      if (selected.length === 0) {
        console.log(chalk.dim("Cancelled."));
        return;
      }

      let store = await readMetaStore(config.plansDir);
      for (const plan of selected) {
        const oldMeta = getMeta(store, plan.filename);
        const oldStatus = oldMeta?.status ?? "(unset)";
        store = setMeta(store, plan.filename, { status: newStatus });
        console.log(
          `${chalk.green("✓")} ${plan.filename}: ${oldStatus} → ${colorStatus(newStatus)}`,
        );
      }
      await writeMetaStore(config.plansDir, store);
      return;
    }

    // Single file mode: explicit file ref or --latest
    const ctx = await resolveTargetPlan(fileRef, !!values.latest);
    if (!ctx) return;

    const { config, plan } = ctx;
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
