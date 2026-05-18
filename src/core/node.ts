import type { ProxyNode } from "../types";

export function decodeName(fragment: string): string {
  if (!fragment) {
    return "";
  }

  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

export function normalizeName(
  alias: string,
  originalName: string,
  server: string,
  port: number
): string {
  const trimmedAlias = alias.trim();
  const fallbackName = `${server}:${port}`;
  const baseName = originalName.trim() || fallbackName;

  if (!trimmedAlias) {
    return baseName;
  }

  if (baseName.startsWith(`${trimmedAlias}-`)) {
    return baseName;
  }

  return `${trimmedAlias}-${baseName}`;
}

export function createNodeId(parts: unknown): string {
  const payload = JSON.stringify(parts);
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function dedupeNodeNames(nodes: ProxyNode[]): ProxyNode[] {
  const counts = new Map<string, number>();

  return nodes.map((node) => {
    const count = counts.get(node.name) ?? 0;
    counts.set(node.name, count + 1);

    if (count === 0) {
      return node;
    }

    return {
      ...node,
      name: `${node.name}-${count + 1}`,
      warnings: [...node.warnings, `Duplicate node name renamed with suffix ${count + 1}`]
    } as ProxyNode;
  });
}
