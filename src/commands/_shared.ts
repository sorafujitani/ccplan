import { resolveConfig, type Config } from "../core/config.js";
import {
  resolveSinglePlan,
  scanPlansWithMeta,
  type Plan,
} from "../core/plan.js";
import { selectPlan } from "../utils/prompt.js";
import chalk from "chalk";

export type ResolvedContext = { config: Config; plan: Plan };

export async function resolveTargetPlan(
  positional: string | undefined,
  useLatest: boolean,
): Promise<ResolvedContext | null> {
  const config = await resolveConfig();

  if (positional || useLatest) {
    const result = await resolveSinglePlan(
      config.plansDir,
      positional,
      useLatest,
    );
    if (!result.ok) {
      console.error(
        `${result.error} Run 'ccplan list' to see available plans.`,
      );
      process.exitCode = 1;
      return null;
    }
    return { config, plan: result.plan };
  }

  // Interactive selection: neither positional nor --latest
  if (!process.stdout.isTTY) {
    console.error(
      "No plan file specified. Run 'ccplan list' to see available plans.",
    );
    process.exitCode = 1;
    return null;
  }

  const plans = await scanPlansWithMeta(config.plansDir);

  if (plans.length === 0) {
    console.error("No plans found.");
    process.exitCode = 1;
    return null;
  }

  if (plans.length === 1) {
    const plan = plans[0];
    console.log(chalk.dim(`Auto-selected: ${plan.filename}`));
    return { config, plan };
  }

  plans.sort((a, b) => {
    const aDate = a.meta?.updated ?? "";
    const bDate = b.meta?.updated ?? "";
    return bDate.localeCompare(aDate);
  });

  const selected = await selectPlan(plans);
  if (!selected) {
    console.log(chalk.dim("Cancelled."));
    return null;
  }

  return { config, plan: selected };
}
