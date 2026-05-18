import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AdapterFormat } from "./types";
import { getClientAdapter } from "./adapters";
import { parseSubscriptionFromUrl } from "./core/subscription";

interface CliArgs {
  url: string;
  alias: string;
  format: AdapterFormat;
  out?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args.set(key, value);
    index += 1;
  }

  const url = args.get("url");
  const alias = args.get("alias");
  const format = (args.get("format") ?? "raw") as AdapterFormat;

  if (!url) {
    throw new Error("Missing --url");
  }
  if (!alias) {
    throw new Error("Missing --alias");
  }

  return {
    url,
    alias,
    format,
    out: args.get("out")
  };
}

function defaultOutputPath(alias: string, format: AdapterFormat): string {
  if (format === "raw") {
    return `data/${alias}.json`;
  }

  const extension = format === "surge" ? "conf" : format === "clash" ? "yaml" : "json";
  return `dist/${alias}.${format}.${extension}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const adapter = getClientAdapter(args.format);

  if (!adapter) {
    throw new Error(`Unsupported format: ${args.format}`);
  }

  const subscription = await parseSubscriptionFromUrl(args.url, args.alias);
  const result = adapter.render(subscription);
  const outPath = args.out ?? defaultOutputPath(args.alias, args.format);
  const body =
    typeof result.body === "string" ? result.body : `${JSON.stringify(result.body, null, 2)}\n`;

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, body, "utf8");

  console.log(`Wrote ${outPath}`);
  if (result.warnings.length > 0) {
    console.warn(result.warnings.join("\n"));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
