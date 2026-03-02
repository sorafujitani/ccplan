import { createInterface } from "node:readline";
import select from "@inquirer/select";
import checkbox from "@inquirer/checkbox";
import chalk from "chalk";
import type { Plan } from "../core/plan.js";
import { colorStatus } from "./format.js";
import { formatRelativeDate } from "./format.js";

export async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

function planChoices(plans: Plan[]) {
  return plans.map((plan) => {
    const status = plan.meta
      ? colorStatus(plan.meta.status)
      : chalk.dim("unknown");
    const updated = plan.meta?.updated
      ? chalk.dim(formatRelativeDate(plan.meta.updated))
      : "";
    return {
      name: `${status}  ${plan.filename}  ${updated}`,
      value: plan,
    };
  });
}

export async function selectPlan(plans: Plan[]): Promise<Plan | null> {
  try {
    return await select({
      message: "Select a plan",
      choices: planChoices(plans),
      loop: false,
    });
  } catch {
    return null;
  }
}

export async function selectPlans(plans: Plan[]): Promise<Plan[]> {
  try {
    return await checkbox({
      message: "Select plans (space to toggle, enter to confirm)",
      choices: planChoices(plans),
      loop: false,
    });
  } catch {
    return [];
  }
}
