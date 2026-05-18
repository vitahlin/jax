import type { ParsedSubscription, ProxyNode, UnsupportedNode } from "../types";
import { protocolParsers } from "../parsers";
import { dedupeNodeNames } from "./node";
import { tryDecodeBase64 } from "./base64";

const SUPPORTED_URI_PATTERN = /^(vless|ss):\/\//im;

export function decodeSubscription(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  if (SUPPORTED_URI_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const decoded = tryDecodeBase64(trimmed);
  if (decoded && SUPPORTED_URI_PATTERN.test(decoded)) {
    return decoded;
  }

  return trimmed;
}

export async function fetchSubscription(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "jax-subscription-converter/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subscription: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export function parseSubscription(
  input: string,
  alias: string,
  generatedAt = new Date().toISOString()
): ParsedSubscription {
  const decoded = decodeSubscription(input);
  const lines = decoded
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const nodes: ProxyNode[] = [];
  const unsupported: UnsupportedNode[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const parser = protocolParsers.find((candidate) => candidate.match(line));
    if (!parser) {
      unsupported.push({ uri: line, reason: "Unsupported or unrecognized URI scheme" });
      continue;
    }

    try {
      nodes.push(parser.parse(line, { alias }));
    } catch (error) {
      unsupported.push({
        uri: line,
        reason: error instanceof Error ? error.message : "Failed to parse URI"
      });
    }
  }

  return {
    version: 1,
    alias,
    generatedAt,
    source: {
      type: "subscription"
    },
    nodes: dedupeNodeNames(nodes),
    unsupported,
    warnings
  };
}

export async function parseSubscriptionFromUrl(url: string, alias: string): Promise<ParsedSubscription> {
  const body = await fetchSubscription(url);
  return parseSubscription(body, alias);
}
