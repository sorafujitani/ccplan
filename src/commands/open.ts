import { resolveConfig } from "../core/config.js";
import { resolveSinglePlan } from "../core/plan.js";
import { parse } from "../cli/args.js";
import type { CommandDef } from "../cli/router.js";

const options = {
  latest: {
    type: "boolean",
    short: "l",
    description: "Open the most recently modified plan",
  },
} as const satisfies import("../cli/args.js").OptionDefs;

export const openCommand: CommandDef = {
  name: "open",
  description: "Open plan in $EDITOR",
  usage: "ccplan open <file> [--latest]",
  options,
  handler: async (args) => {
    const { values, positionals } = parse(args, options);
    const config = await resolveConfig();

    const result = await resolveSinglePlan(
      config.plansDir,
      positionals[0],
      !!values.latest,
    );
    if (!result.ok) {
      console.error(result.error);
      process.exitCode = 1;
      return;
    }

    const editor = process.env.EDITOR ?? "vi";
    const { spawn } = await import("node:child_process");
    const proc = spawn(editor, [result.plan.filepath], { stdio: "inherit" });
    await new Promise<void>((resolve, reject) => {
      proc.on("close", (code) => {
        if (code !== 0) reject(new Error(`Editor exited with code ${code}`));
        else resolve();
      });
      proc.on("error", reject);
    });
  },
};
