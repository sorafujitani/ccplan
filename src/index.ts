import pkg from "../package.json" with { type: "json" };
import { Router } from "./cli/router.js";
import { listCommand } from "./commands/list.js";
import { statusCommand } from "./commands/status.js";
import { cleanCommand } from "./commands/clean.js";
import { openCommand } from "./commands/open.js";

const router = new Router(pkg.version);

router.register(listCommand);
router.register(statusCommand);
router.register(cleanCommand);
router.register(openCommand);

try {
  await router.run(process.argv);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
