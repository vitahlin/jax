export type NodeProtocol = "vless" | "ss";

export interface RawNodeData {
  uri: string;
  query: Record<string, string>;
}

export interface BaseNode {
  id: string;
  name: string;
  originalName: string;
  protocol: NodeProtocol;
  server: string;
  port: number;
  raw: RawNodeData;
  warnings: string[];
}

export type VlessTransport =
  | {
      type: "tcp";
      host?: string;
      path?: string;
      headerType?: string;
      options?: Record<string, string>;
    }
  | {
      type: "ws";
      host?: string;
      path?: string;
      options?: Record<string, string>;
    }
  | {
      type: "grpc";
      serviceName?: string;
      options?: Record<string, string>;
    }
  | {
      type: "httpupgrade";
      host?: string;
      path?: string;
      options?: Record<string, string>;
    }
  | {
      type: "xhttp";
      host?: string;
      path?: string;
      mode?: string;
      options?: Record<string, string>;
    }
  | {
      type: "unknown";
      originalType: string;
      options: Record<string, string>;
    };

export type VlessSecurity =
  | {
      type: "none";
      flow?: string;
      options?: Record<string, string>;
    }
  | {
      type: "tls";
      sni?: string;
      allowInsecure?: boolean;
      fingerprint?: string;
      flow?: string;
      alpn?: string[];
      options?: Record<string, string>;
    }
  | {
      type: "reality";
      sni?: string;
      allowInsecure?: boolean;
      fingerprint?: string;
      flow?: string;
      publicKey?: string;
      shortId?: string;
      spiderX?: string;
      alpn?: string[];
      options?: Record<string, string>;
    }
  | {
      type: "unknown";
      originalType: string;
      flow?: string;
      options: Record<string, string>;
    };

export interface VlessNode extends BaseNode {
  protocol: "vless";
  credentials: {
    uuid: string;
  };
  transport: VlessTransport;
  security: VlessSecurity;
}

export interface ShadowsocksNode extends BaseNode {
  protocol: "ss";
  credentials: {
    method: string;
    password: string;
  };
  plugin?: {
    type: string;
    options: Record<string, string>;
  };
}

export type ProxyNode = VlessNode | ShadowsocksNode;

export interface UnsupportedNode {
  uri: string;
  reason: string;
}

export interface ParsedSubscription {
  version: 1;
  alias: string;
  generatedAt: string;
  source: {
    type: "subscription";
  };
  nodes: ProxyNode[];
  unsupported: UnsupportedNode[];
  warnings: string[];
}

export interface ParseContext {
  alias: string;
}

export interface ProtocolParser<TNode extends ProxyNode = ProxyNode> {
  protocol: NodeProtocol;
  match(uri: string): boolean;
  parse(uri: string, context: ParseContext): TNode;
}

export type AdapterFormat =
  | "raw"
  | "singbox"
  | "singbox-outbounds"
  | "clash"
  | "surge";

export interface AdapterResult<T = unknown> {
  format: AdapterFormat;
  contentType: string;
  body: T;
  warnings: string[];
}

export interface ClientAdapter<T = unknown> {
  format: AdapterFormat;
  render(subscription: ParsedSubscription): AdapterResult<T>;
}
