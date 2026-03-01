import { unlink } from "node:fs/promises";
import { resolveConfig } from "../core/config.js";
import { scanPlansWithMeta, resolveSinglePlan } from "../core/plan.js";
import {
  readMetaStore,
  writeMetaStore,
  removeMeta,
} from "../core/metastore.js";
import { parse } from "../cli/args.js";
import { confirm } from "../utils/prompt.js";
import type { CommandDef } from "../cli/router.js";
import chalk from "chalk";

const options = {
  status: {
    type: "string",
    short: "s",
    description: "Filter by status (default: done)",
  },
  days: {
    type: "string",
    short: "d",
    description: "Minimum days since updated (default: 30)",
  },
  all: {
    type: "boolean",
    description: "Remove day limit",
  },
  latest: {
    type: "boolean",
    short: "l",
    description: "Target the most recently modified plan",
  },
  "dry-run": {
    type: "boolean",
    description: "Preview without changes",
  },
  force: {
    type: "boolean",
    short: "f",
    description: "Skip confirmation",
  },
} as const satisfies import("../cli/args.js").OptionDefs;

export const cleanCommand: CommandDef = {
  name: "clean",
  description: "Delete done plans",
  usage:
    "ccplan clean [file] [-s <status>] [--days <n>] [--all] [--latest] [--dry-run] [--force]",
  options,
  handler: async (args) => {
    const { values, positionals } = parse(args, options);
    const dryRun = values["dry-run"];

    const config = await resolveConfig();

    // Single-file mode: positional arg or --latest
    if (positionals.length > 0 || values.latest) {
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
      console.log(`Target: ${plan.filename}`);

      if (dryRun) {
        console.log(chalk.dim("(dry run — no changes made)"));
        return;
      }

      if (!values.force) {
        const ok = await confirm(`Delete ${plan.filename}?`);
        if (!ok) {
          console.log(chalk.dim("Cancelled."));
          return;
        }
      }

      let store = await readMetaStore(config.plansDir);
      await unlink(plan.filepath);
      store = removeMeta(store, plan.filename);
      await writeMetaStore(config.plansDir, store);
      console.log(`${chalk.dim("-")} ${plan.filename} deleted`);
      return;
    }

    // Batch mode
    if (values.all && values.days) {
      console.error("Cannot use --all and --days together. Use one or the other.");
      process.exitCode = 1;
      return;
    }

    const statusFilter = values.status ?? "done";
    const minDays = values.all ? 0 : values.days ? parseInt(values.days, 10) : 30;

    const plans = await scanPlansWithMeta(config.plansDir);

    const now = new Date();
    const targets = plans.filter((p) => {
      if (p.meta?.status !== statusFilter) return false;
      if (values.all) return true;
      if (!p.meta.updated) return true;
      const updated = new Date(p.meta.updated);
      const diffDays =
        (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= minDays;
    });

    if (targets.length === 0) {
      const hint = values.all
        ? `status=${statusFilter}`
        : `status=${statusFilter}, ${minDays}+ days old`;
      console.log(chalk.dim(`No plans to delete. (${hint})`));
      return;
    }

    console.log(`Found ${targets.length} plan(s) to delete:`);
    for (const plan of targets) {
      console.log(`  ${plan.filename}`);
    }

    if (dryRun) {
      console.log(chalk.dim("\n(dry run — no changes made)"));
      return;
    }

    if (!values.force) {
      const ok = await confirm("\nDelete these plans?");
      if (!ok) {
        console.log(chalk.dim("Cancelled."));
        return;
      }
    }

    let store = await readMetaStore(config.plansDir);
    for (const plan of targets) {
      await unlink(plan.filepath);
      store = removeMeta(store, plan.filename);
      console.log(`${chalk.dim("-")} ${plan.filename} deleted`);
    }
    await writeMetaStore(config.plansDir, store);
  },
};
