import type {
  AdapterResult,
  ClientAdapter,
  ParsedSubscription,
  ProxyNode,
  ShadowsocksNode,
  VlessNode
} from "../types";

type SingboxOutbound = Record<string, unknown>;

function withDefinedValues(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function vlessTransport(node: VlessNode): Record<string, unknown> | undefined {
  const transport = node.transport;

  if (transport.type === "tcp") {
    return undefined;
  }

  if (transport.type === "ws") {
    return withDefinedValues({
      type: transport.type,
      host: transport.host,
      path: transport.path
    });
  }

  if (transport.type === "httpupgrade") {
    return withDefinedValues({
      type: transport.type,
      host: transport.host,
      path: transport.path
    });
  }

  if (transport.type === "xhttp") {
    return withDefinedValues({
      type: transport.type,
      host: transport.host,
      path: transport.path,
      mode: transport.mode
    });
  }

  if (transport.type === "grpc") {
    return withDefinedValues({
      type: "grpc",
      service_name: transport.serviceName
    });
  }

  return {
    type: transport.originalType,
    ...(transport.options ?? {})
  };
}

function vlessTls(node: VlessNode): Record<string, unknown> | undefined {
  const security = node.security;
  if (security.type === "none") {
    return undefined;
  }

  const tls: Record<string, unknown> = withDefinedValues({
    enabled: true,
    server_name: "sni" in security ? security.sni : undefined,
    insecure: "allowInsecure" in security ? security.allowInsecure : undefined,
    alpn: "alpn" in security ? security.alpn : undefined,
    utls:
      "fingerprint" in security && security.fingerprint
        ? {
            enabled: true,
            fingerprint: security.fingerprint
          }
        : undefined
  });

  if (security.type === "reality") {
    tls.reality = withDefinedValues({
      enabled: true,
      public_key: security.publicKey,
      short_id: security.shortId
    });
  }

  return tls;
}

function vlessOutbound(node: VlessNode): SingboxOutbound {
  return withDefinedValues({
    type: "vless",
    tag: node.name,
    server: node.server,
    server_port: node.port,
    uuid: node.credentials.uuid,
    flow: node.security.flow,
    network: node.transport.type === "tcp" ? "tcp" : undefined,
    tls: vlessTls(node),
    transport: vlessTransport(node)
  });
}

function shadowsocksPlugin(node: ShadowsocksNode): Partial<SingboxOutbound> {
  if (!node.plugin) {
    return {};
  }

  if (node.plugin.type === "simple-obfs") {
    return {
      plugin: "obfs-local",
      plugin_opts: Object.entries(node.plugin.options)
        .map(([key, value]) => `${key}=${value}`)
        .join(";")
    };
  }

  return {
    plugin: node.plugin.type,
    plugin_opts: Object.entries(node.plugin.options)
      .map(([key, value]) => `${key}=${value}`)
      .join(";")
  };
}

function shadowsocksOutbound(node: ShadowsocksNode): SingboxOutbound {
  return withDefinedValues({
    type: "shadowsocks",
    tag: node.name,
    server: node.server,
    server_port: node.port,
    method: node.credentials.method,
    password: node.credentials.password,
    ...shadowsocksPlugin(node)
  });
}

export function nodeToSingboxOutbound(node: ProxyNode): SingboxOutbound {
  if (node.protocol === "vless") {
    return vlessOutbound(node);
  }

  return shadowsocksOutbound(node);
}

export function renderSingboxOutbounds(subscription: ParsedSubscription): SingboxOutbound[] {
  return subscription.nodes.map(nodeToSingboxOutbound);
}

export function renderSingboxConfig(subscription: ParsedSubscription): Record<string, unknown> {
  const proxyTags = subscription.nodes.map((node) => node.name);
  const firstProxy = proxyTags[0];

  return {
    log: {
      level: "info"
    },
    inbounds: [
      {
        type: "mixed",
        tag: "mixed-in",
        listen: "127.0.0.1",
        listen_port: 7890
      }
    ],
    outbounds: [
      {
        type: "selector",
        tag: "proxy",
        outbounds: proxyTags,
        default: firstProxy
      },
      ...renderSingboxOutbounds(subscription),
      {
        type: "direct",
        tag: "direct"
      }
    ],
    route: {
      final: firstProxy ? "proxy" : "direct"
    }
  };
}

export const singboxOutboundsAdapter: ClientAdapter<SingboxOutbound[]> = {
  format: "singbox-outbounds",
  render(subscription: ParsedSubscription): AdapterResult<SingboxOutbound[]> {
    return {
      format: "singbox-outbounds",
      contentType: "application/json; charset=utf-8",
      body: renderSingboxOutbounds(subscription),
      warnings: subscription.warnings
    };
  }
};

export const singboxAdapter: ClientAdapter<Record<string, unknown>> = {
  format: "singbox",
  render(subscription: ParsedSubscription): AdapterResult<Record<string, unknown>> {
    return {
      format: "singbox",
      contentType: "application/json; charset=utf-8",
      body: renderSingboxConfig(subscription),
      warnings: subscription.warnings
    };
  }
};
