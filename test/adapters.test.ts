import { describe, expect, it } from "vitest";
import { renderSingboxConfig, renderSingboxOutbounds } from "../src/adapters/singbox";
import { parseSubscription } from "../src/core/subscription";

describe("singbox adapter", () => {
  it("renders VLESS and SS outbounds", () => {
    const parsed = parseSubscription(
      [
        "vless://00000000-0000-4000-8000-000000000000@example.com:443?type=tcp&security=tls&sni=example.com&fp=chrome&flow=xtls-rprx-vision#VLESS",
        "ss://YWVzLTEyOC1nY206cGFzcw@example.org:8388?plugin=simple-obfs%3Bobfs%3Dhttp%3Bobfs-host%3Dexample.org#SS"
      ].join("\n"),
      "MF"
    );

    const outbounds = renderSingboxOutbounds(parsed);
    expect(outbounds).toHaveLength(2);
    expect(outbounds[0]).toMatchObject({
      type: "vless",
      tag: "MF-VLESS",
      server: "example.com",
      server_port: 443,
      flow: "xtls-rprx-vision"
    });
    expect(outbounds[1]).toMatchObject({
      type: "shadowsocks",
      tag: "MF-SS",
      plugin: "obfs-local",
      plugin_opts: "obfs=http;obfs-host=example.org"
    });
  });

  it("renders a runnable singbox config", () => {
    const parsed = parseSubscription(
      "ss://YWVzLTEyOC1nY206cGFzcw@example.org:8388#SS",
      "MF"
    );
    const config = renderSingboxConfig(parsed);

    expect(config).toMatchObject({
      route: {
        final: "proxy"
      }
    });
    expect(config.outbounds).toBeInstanceOf(Array);
  });
});
