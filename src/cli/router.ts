import { parse, formatOptionsHelp } from "./args.js";
import type { OptionDefs } from "./args.js";

export type CommandHandler = (args: string[]) => Promise<void>;

export type CommandDef = {
  name: string;
  description: string;
  usage?: string;
  options?: OptionDefs;
  handler: CommandHandler;
};

export class Router {
  private commands = new Map<string, CommandDef>();
  private version: string;

  constructor(version: string) {
    this.version = version;
  }

  register(cmd: CommandDef): void {
    this.commands.set(cmd.name, cmd);
  }

  async run(argv: string[]): Promise<void> {
    const args = argv.slice(2);
    const first = args[0];

    if (!first || first === "--help" || first === "-h") {
      this.printHelp();
      return;
    }

    if (first === "--version" || first === "-V") {
      console.log(this.version);
      return;
    }

    const cmd = this.commands.get(first);
    if (cmd) {
      const subArgs = args.slice(1);
      if (subArgs.includes("--help") || subArgs.includes("-h")) {
        this.printCommandHelp(cmd);
        return;
      }
      await cmd.handler(subArgs);
    } else {
      // デフォルトで list を実行（サブコマンド未指定時）
      const listCmd = this.commands.get("list");
      if (listCmd) {
        await listCmd.handler(args);
      } else {
        console.error(`Unknown command: ${first}`);
        this.printHelp();
        process.exitCode = 1;
      }
    }
  }

  private printHelp(): void {
    console.log(`ccplan v${this.version} — Claude Code plan manager\n`);
    console.log("Usage: ccplan [command] [options]\n");
    console.log("Commands:");
    for (const cmd of this.commands.values()) {
      console.log(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
    }
    console.log(`\nRun 'ccplan <command> --help' for command-specific help.`);
  }

  private printCommandHelp(cmd: CommandDef): void {
    console.log(`ccplan ${cmd.name} — ${cmd.description}\n`);
    if (cmd.usage) {
      console.log(`Usage: ${cmd.usage}\n`);
    }
    if (cmd.options) {
      console.log("Options:");
      console.log(formatOptionsHelp(cmd.options));
    }
  }
}
