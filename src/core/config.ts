import { execSync } from "node:child_process";
import { join } from "node:path";
import { dirExists } from "../utils/fs.js";

export type Config = {
  gitRoot: string;
  plansDir: string;
};

export function findGitRoot(): string {
  try {
    const stdout = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (!stdout) {
      throw new Error("Not a git repository (or git is not installed)");
    }
    return stdout;
  } catch {
    throw new Error("Not a git repository (or git is not installed)");
  }
}

export async function resolveConfig(): Promise<Config> {
  const gitRoot = findGitRoot();
  const plansDir = join(gitRoot, ".claude", "plans");

  if (!(await dirExists(plansDir))) {
    throw new Error(
      `Plans directory not found: ${plansDir}\nRun Claude Code in plan mode to create plans first.`,
    );
  }

  return { gitRoot, plansDir };
}
