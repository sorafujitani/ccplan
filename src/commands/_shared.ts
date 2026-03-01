import { resolveConfig, type Config } from "../core/config.js";
import { resolveSinglePlan, type Plan } from "../core/plan.js";

export type ResolvedContext = { config: Config; plan: Plan };

export async function resolveTargetPlan(
  positional: string | undefined,
  useLatest: boolean,
): Promise<ResolvedContext | null> {
  const config = await resolveConfig();
  const result = await resolveSinglePlan(
    config.plansDir,
    positional,
    useLatest,
  );
  if (!result.ok) {
    console.error(`${result.error} Run 'ccplan list' to see available plans.`);
    process.exitCode = 1;
    return null;
  }
  return { config, plan: result.plan };
}
