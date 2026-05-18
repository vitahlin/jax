import type { ParseContext, ShadowsocksNode } from "../types";
import { decodeBase64, tryDecodeBase64 } from "../core/base64";
import { createNodeId, decodeName, normalizeName } from "../core/node";
import { queryToRecord } from "../core/query";

interface ParsedAuthority {
  method: string;
  password: string;
  server: string;
  port: number;
}

function splitLast(input: string, separator: string): [string, string] | null {
  const index = input.lastIndexOf(separator);
  if (index === -1) {
    return null;
  }

  return [input.slice(0, index), input.slice(index + separator.length)];
}

function parseMethodPassword(value: string): { method: string; password: string } {
  const base64Decoded = tryDecodeBase64(value);
  const decoded =
    base64Decoded && base64Decoded.includes(":") ? base64Decoded : decodeURIComponent(value);
  const parts = decoded.split(":");
  if (parts.length < 2) {
    throw new Error("SS URI is missing method or password");
  }

  return {
    method: parts.shift() ?? "",
    password: parts.join(":")
  };
}

function parseAuthority(authority: string): ParsedAuthority {
  const atParts = splitLast(authority, "@");

  if (atParts) {
    const [userinfo, hostPort] = atParts;
    const credentials = parseMethodPassword(userinfo);
    const parsed = new URL(`ss://${hostPort}`);
    const port = Number(parsed.port);

    if (!parsed.hostname || !Number.isInteger(port) || port <= 0) {
      throw new Error("SS URI is missing a valid server or port");
    }

    return {
      ...credentials,
      server: parsed.hostname,
      port
    };
  }

  const decoded = decodeBase64(authority);
  const decodedAtParts = splitLast(decoded, "@");
  if (!decodedAtParts) {
    throw new Error("SS URI base64 body is missing server");
  }

  const [userinfo, hostPort] = decodedAtParts;
  const credentials = parseMethodPassword(userinfo);
  const parsed = new URL(`ss://${hostPort}`);
  const port = Number(parsed.port);

  if (!parsed.hostname || !Number.isInteger(port) || port <= 0) {
    throw new Error("SS URI is missing a valid server or port");
  }

  return {
    ...credentials,
    server: parsed.hostname,
    port
  };
}

function parsePlugin(value: string | undefined): ShadowsocksNode["plugin"] {
  if (!value) {
    return undefined;
  }

  const decoded = decodeURIComponent(value);
  const [type = "", ...segments] = decoded.split(";");
  const options: Record<string, string> = {};

  for (const segment of segments) {
    if (!segment) {
      continue;
    }

    const [key, ...rest] = segment.split("=");
    options[key] = rest.join("=");
  }

  return {
    type,
    options
  };
}

export const shadowsocksParser = {
  protocol: "ss" as const,
  match(uri: string): boolean {
    return uri.toLowerCase().startsWith("ss://");
  },
  parse(uri: string, context: ParseContext): ShadowsocksNode {
    const withoutScheme = uri.slice("ss://".length);
    const hashIndex = withoutScheme.indexOf("#");
    const beforeHash = hashIndex === -1 ? withoutScheme : withoutScheme.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? "" : withoutScheme.slice(hashIndex + 1);
    const queryIndex = beforeHash.indexOf("?");
    const authority = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
    const queryString = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);
    const query = queryToRecord(new URLSearchParams(queryString));
    const parsed = parseAuthority(authority);
    const originalName = decodeName(fragment);

    return {
      id: createNodeId({
        protocol: "ss",
        server: parsed.server,
        port: parsed.port,
        method: parsed.method,
        password: parsed.password
      }),
      name: normalizeName(context.alias, originalName, parsed.server, parsed.port),
      originalName,
      protocol: "ss",
      server: parsed.server,
      port: parsed.port,
      credentials: {
        method: parsed.method,
        password: parsed.password
      },
      plugin: parsePlugin(query.plugin),
      raw: {
        uri,
        query
      },
      warnings: []
    };
  }
};
