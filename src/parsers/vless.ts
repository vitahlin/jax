import type { ParseContext, VlessNode, VlessSecurity, VlessTransport } from "../types";
import { createNodeId, decodeName, normalizeName } from "../core/node";
import { parseBoolean, pickOptions, queryToRecord, splitCsv } from "../core/query";

const KNOWN_VLESS_KEYS = [
  "type",
  "encryption",
  "host",
  "path",
  "headerType",
  "quicSecurity",
  "serviceName",
  "security",
  "flow",
  "fp",
  "sni",
  "allowInsecure",
  "alpn",
  "pbk",
  "sid",
  "spx",
  "mode"
] as const;

function buildTransport(query: Record<string, string>): VlessTransport {
  const type = query.type || "tcp";
  const options = pickOptions(query, KNOWN_VLESS_KEYS);

  if (type === "tcp") {
    return {
      type,
      host: query.host || undefined,
      path: query.path || undefined,
      headerType: query.headerType || undefined,
      options
    };
  }

  if (type === "ws") {
    return {
      type,
      host: query.host || undefined,
      path: query.path || undefined,
      options
    };
  }

  if (type === "httpupgrade") {
    return {
      type,
      host: query.host || undefined,
      path: query.path || undefined,
      options
    };
  }

  if (type === "grpc") {
    return {
      type,
      serviceName: query.serviceName || undefined,
      options
    };
  }

  if (type === "xhttp") {
    return {
      type,
      host: query.host || undefined,
      path: query.path || undefined,
      mode: query.mode || undefined,
      options
    };
  }

  return {
    type: "unknown",
    originalType: type,
    options: options ?? {}
  };
}

function buildSecurity(query: Record<string, string>): VlessSecurity {
  const type = query.security || "none";
  const common = {
    flow: query.flow || undefined,
    options: pickOptions(query, KNOWN_VLESS_KEYS)
  };

  if (type === "tls") {
    return {
      type,
      sni: query.sni || undefined,
      allowInsecure: parseBoolean(query.allowInsecure),
      fingerprint: query.fp || undefined,
      alpn: splitCsv(query.alpn),
      ...common
    };
  }

  if (type === "reality") {
    return {
      type,
      sni: query.sni || undefined,
      allowInsecure: parseBoolean(query.allowInsecure),
      fingerprint: query.fp || undefined,
      publicKey: query.pbk || undefined,
      shortId: query.sid || undefined,
      spiderX: query.spx || undefined,
      alpn: splitCsv(query.alpn),
      ...common
    };
  }

  if (type === "none") {
    return {
      type,
      ...common
    };
  }

  return {
    type: "unknown",
    originalType: type,
    ...common,
    options: common.options ?? {}
  };
}

export const vlessParser = {
  protocol: "vless" as const,
  match(uri: string): boolean {
    return uri.toLowerCase().startsWith("vless://");
  },
  parse(uri: string, context: ParseContext): VlessNode {
    const url = new URL(uri);
    const query = queryToRecord(url.searchParams);
    const originalName = decodeName(url.hash.slice(1));
    const server = url.hostname;
    const port = Number(url.port);
    const uuid = decodeURIComponent(url.username);

    if (!server) {
      throw new Error("VLESS URI is missing server");
    }

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error("VLESS URI is missing a valid port");
    }

    if (!uuid) {
      throw new Error("VLESS URI is missing uuid");
    }

    const node: VlessNode = {
      id: createNodeId({ protocol: "vless", server, port, uuid }),
      name: normalizeName(context.alias, originalName, server, port),
      originalName,
      protocol: "vless",
      server,
      port,
      credentials: {
        uuid
      },
      transport: buildTransport(query),
      security: buildSecurity(query),
      raw: {
        uri,
        query
      },
      warnings: []
    };

    if (query.encryption && query.encryption !== "none") {
      node.warnings.push(`Unexpected VLESS encryption value: ${query.encryption}`);
    }

    return node;
  }
};
