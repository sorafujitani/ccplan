import { join } from "node:path";
import { dirExists } from "../utils/fs.js";

export type Config = {
  gitRoot: string;
  plansDir: string;
};

export async function findGitRoot(): Promise<string> {
  const proc = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"]);
  const stdout = proc.stdout.toString().trim();
  if (proc.exitCode !== 0 || !stdout) {
    throw new Error("Not a git repository (or git is not installed)");
  }
  return stdout;
}

export async function resolveConfig(): Promise<Config> {
  const gitRoot = await findGitRoot();
  const plansDir = join(gitRoot, ".claude", "plans");

  if (!(await dirExists(plansDir))) {
    throw new Error(
      `Plans directory not found: ${plansDir}\nRun Claude Code in plan mode to create plans first.`,
    );
  }

  return { gitRoot, plansDir };
}
