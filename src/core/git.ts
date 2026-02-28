export async function getCurrentBranch(): Promise<string> {
  const proc = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"]);
  const stdout = proc.stdout.toString().trim();
  if (proc.exitCode !== 0 || !stdout) {
    throw new Error("Failed to get current branch");
  }
  return stdout;
}

export async function listBranches(): Promise<string[]> {
  const proc = Bun.spawnSync(["git", "branch", "--format=%(refname:short)"]);
  if (proc.exitCode !== 0) {
    throw new Error("Failed to list branches");
  }
  return proc.stdout
    .toString()
    .trim()
    .split("\n")
    .filter((b) => b.length > 0);
}

export async function branchExists(branch: string): Promise<boolean> {
  const proc = Bun.spawnSync([
    "git",
    "rev-parse",
    "--verify",
    `refs/heads/${branch}`,
  ]);
  return proc.exitCode === 0;
}

export async function isBranchMerged(
  branch: string,
  into = "main",
): Promise<boolean> {
  const proc = Bun.spawnSync([
    "git",
    "branch",
    "--merged",
    into,
    "--format=%(refname:short)",
  ]);
  if (proc.exitCode !== 0) return false;
  const merged = proc.stdout.toString().trim().split("\n");
  return merged.includes(branch);
}
