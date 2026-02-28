import { Router } from "./cli/router.js";
import { listCommand } from "./commands/list.js";
import { statusCommand } from "./commands/status.js";
import { cleanCommand } from "./commands/clean.js";
import { openCommand } from "./commands/open.js";

const VERSION = "0.1.0";

const router = new Router(VERSION);

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
