import { Router } from "./cli/router.js";
import { listCommand } from "./commands/list.js";
import { statusCommand } from "./commands/status.js";
import { initCommand } from "./commands/init.js";
import { showCommand } from "./commands/show.js";
import { cleanCommand } from "./commands/clean.js";
import { linkCommand } from "./commands/link.js";
import { syncCommand } from "./commands/sync.js";

const VERSION = "0.1.0";

const router = new Router(VERSION);

router.register(listCommand);
router.register(statusCommand);
router.register(initCommand);
router.register(showCommand);
router.register(cleanCommand);
router.register(linkCommand);
router.register(syncCommand);

try {
  await router.run(process.argv);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
