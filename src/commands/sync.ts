import { readFile, writeFile } from "node:fs/promises";
import { resolveConfig } from "../core/config.js";
import { scanPlans } from "../core/plan.js";
import { serializePlan } from "../core/frontmatter.js";
import { isBranchMerged } from "../core/git.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";
import chalk from "chalk";

const options = {
  "dry-run": {
    type: "boolean" as const,
    description: "Preview without changes",
  },
  into: {
    type: "string" as const,
    description: "Target branch to check merge status (default: main)",
  },
};

export const syncCommand: CommandDef = {
  name: "sync",
  description: "Sync plan status with git branch state",
  usage: "ccplan sync [--dry-run] [--into <branch>]",
  options,
  handler: async (args) => {
    const { values } = parse(args, options);
    const dryRun = values["dry-run"] as boolean | undefined;
    const into = values.into ?? "main";

    const config = await resolveConfig();
    const plans = await scanPlans(config.plansDir);

    // branch が紐付いており、まだ done/archived でない plan のみ
    const linked = plans.filter(
      (p) =>
        p.frontmatter?.branch &&
        p.frontmatter.status !== "done" &&
        p.frontmatter.status !== "archived",
    );

    if (linked.length === 0) {
      console.log(chalk.dim("No linked plans to sync."));
      return;
    }

    let synced = 0;
    for (const plan of linked) {
      const branch = plan.frontmatter!.branch!;
      const merged = await isBranchMerged(branch, into);

      if (merged) {
        if (dryRun) {
          console.log(
            `  ${plan.filename}: ${plan.frontmatter!.status} → done ${chalk.dim(`(${branch} merged into ${into})`)}`,
          );
        } else {
          const raw = await readFile(plan.filepath, "utf-8");
          const updated = serializePlan(raw, { status: "done" });
          await writeFile(plan.filepath, updated, "utf-8");
          console.log(
            `${chalk.green("✓")} ${plan.filename}: ${plan.frontmatter!.status} → done ${chalk.dim(`(${branch} merged)`)}`,
          );
        }
        synced++;
      }
    }

    if (synced === 0) {
      console.log(chalk.dim("No plans updated."));
    } else if (dryRun) {
      console.log(chalk.dim(`\n(dry run — ${synced} plan(s) would be updated)`));
    }
  },
};
