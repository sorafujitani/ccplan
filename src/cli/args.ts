import { parseArgs, type ParseArgsConfig } from "node:util";

export type OptionDef = {
  type: "string" | "boolean";
  short?: string;
  description?: string;
};

export type OptionDefs = Record<string, OptionDef>;

export type ParsedArgs<T extends OptionDefs> = {
  values: {
    [K in keyof T]: T[K]["type"] extends "string"
      ? string | undefined
      : boolean | undefined;
  };
  positionals: string[];
};

export function parse<T extends OptionDefs>(
  args: string[],
  options: T,
): ParsedArgs<T> {
  const { values, positionals } = parseArgs({
    args,
    options: options as ParseArgsConfig["options"],
    allowPositionals: true,
    strict: true,
  });
  return { values, positionals } as ParsedArgs<T>;
}

export function formatOptionsHelp(options: OptionDefs): string {
  const lines: string[] = [];
  for (const [name, def] of Object.entries(options)) {
    const short = def.short ? `-${def.short}, ` : "    ";
    const flag = `--${name}`;
    const typeHint = def.type === "string" ? ` <${name}>` : "";
    const desc = def.description ?? "";
    lines.push(`  ${short}${flag}${typeHint}  ${desc}`);
  }
  return lines.join("\n");
}
