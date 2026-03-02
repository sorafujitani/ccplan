import { createInterface } from "node:readline";
import search from "@inquirer/search";
import checkboxPlus from "inquirer-checkbox-plus-plus";
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

function planLabel(plan: Plan): string {
  const status = plan.meta
    ? colorStatus(plan.meta.status)
    : chalk.dim("unknown");
  const updated = plan.meta?.updated
    ? chalk.dim(formatRelativeDate(plan.meta.updated))
    : "";
  return `${status}  ${plan.filename}  ${updated}`;
}

function matchPlan(plan: Plan, term: string): boolean {
  const lower = term.toLowerCase();
  const haystack = plan.filename.toLowerCase();
  // fuzzy: check if all chars appear in order
  let j = 0;
  for (let i = 0; i < haystack.length && j < lower.length; i++) {
    if (haystack[i] === lower[j]) j++;
  }
  return j === lower.length;
}

export async function selectPlan(plans: Plan[]): Promise<Plan | null> {
  try {
    return await search({
      message: "Select a plan",
      source: async (input) => {
        const term = input ?? "";
        const filtered = term
          ? plans.filter((p) => matchPlan(p, term))
          : plans;
        return filtered.map((plan) => ({
          name: planLabel(plan),
          value: plan,
        }));
      },
    });
  } catch {
    return null;
  }
}

export async function selectPlans(plans: Plan[]): Promise<Plan[]> {
  try {
    return await checkboxPlus({
      message: "Select plans (space to toggle, enter to confirm)",
      searchable: true,
      highlight: true,
      loop: false,
      source: async (_answers: Record<string, unknown>, input: string) => {
        const term = input ?? "";
        const filtered = term
          ? plans.filter((p) => matchPlan(p, term))
          : plans;
        return filtered.map((plan) => ({
          name: planLabel(plan),
          value: plan,
        }));
      },
    });
  } catch {
    return [];
  }
}
