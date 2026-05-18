import { describe, expect, it } from "vitest";
import { encodeUtf8Base64 } from "../src/core/base64";
import { decodeSubscription, parseSubscription } from "../src/core/subscription";

const vlessVision =
  "vless://3d3dc334-9268-4567-89d5-5883f38f92e1@cn2.mofacloud.com:34201?type=tcp&encryption=none&security=tls&flow=xtls-rprx-vision&fp=chrome&sni=live.bilibili.com&allowInsecure=1#%E5%89%A9%E4%BD%99%E6%B5%81%E9%87%8F%EF%BC%9A99241.92%20GB";

describe("subscription parser", () => {
  it("decodes base64 subscriptions", () => {
    expect(decodeSubscription(encodeUtf8Base64(vlessVision))).toBe(vlessVision);
  });

  it("parses VLESS TCP TLS Vision", () => {
    const parsed = parseSubscription(vlessVision, "MF", "2026-05-16T00:00:00.000Z");
    const node = parsed.nodes[0];

    expect(node.protocol).toBe("vless");
    expect(node.name).toBe("MF-剩余流量：99241.92 GB");
    expect(node.server).toBe("cn2.mofacloud.com");
    expect(node.port).toBe(34201);
    expect(node.raw.query.security).toBe("tls");

    if (node.protocol === "vless") {
      expect(node.credentials.uuid).toBe("3d3dc334-9268-4567-89d5-5883f38f92e1");
      expect(node.transport.type).toBe("tcp");
      expect(node.security.type).toBe("tls");
      expect(node.security.flow).toBe("xtls-rprx-vision");
      if (node.security.type === "tls") {
        expect(node.security.fingerprint).toBe("chrome");
        expect(node.security.allowInsecure).toBe(true);
      }
    }
  });

  it("parses VLESS websocket", () => {
    const parsed = parseSubscription(
      "vless://00000000-0000-4000-8000-000000000000@example.com:443?type=ws&security=tls&host=cdn.example.com&path=%2Fray&sni=example.com#WS",
      "MF"
    );
    const node = parsed.nodes[0];
    expect(node.protocol).toBe("vless");
    if (node.protocol === "vless") {
      expect(node.transport.type).toBe("ws");
      expect("host" in node.transport ? node.transport.host : undefined).toBe("cdn.example.com");
      expect("path" in node.transport ? node.transport.path : undefined).toBe("/ray");
    }
  });

  it("parses VLESS grpc", () => {
    const parsed = parseSubscription(
      "vless://00000000-0000-4000-8000-000000000000@example.com:443?type=grpc&security=tls&serviceName=mygrpc&sni=example.com#GRPC",
      "MF"
    );
    const node = parsed.nodes[0];
    expect(node.protocol).toBe("vless");
    if (node.protocol === "vless") {
      expect(node.transport.type).toBe("grpc");
      expect("serviceName" in node.transport ? node.transport.serviceName : undefined).toBe(
        "mygrpc"
      );
    }
  });

  it("parses VLESS reality", () => {
    const parsed = parseSubscription(
      "vless://00000000-0000-4000-8000-000000000000@example.com:443?type=tcp&security=reality&sni=www.microsoft.com&fp=chrome&pbk=public-key&sid=abc&spx=%2F#Reality",
      "MF"
    );
    const node = parsed.nodes[0];
    expect(node.protocol).toBe("vless");
    if (node.protocol === "vless") {
      expect(node.security.type).toBe("reality");
      if (node.security.type === "reality") {
        expect(node.security.publicKey).toBe("public-key");
        expect(node.security.shortId).toBe("abc");
        expect(node.security.spiderX).toBe("/");
      }
    }
  });

  it("parses SS base64 userinfo with simple-obfs", () => {
    const parsed = parseSubscription(
      "ss://YWVzLTEyOC1nY206MzczNTBlZTMtODk5NS00NTY0LTkxNWItMzhhMGJ@gd.bjnet2.com:36602/?plugin=simple-obfs%3Bobfs%3Dhttp%3Bobfs-host%3Dexample.com#%F0%9F%87%AD%F0%9F%87%B0%E9%A6%99%E6%B8%AF-Gemini-IEPL",
      "MF"
    );
    const node = parsed.nodes[0];
    expect(node.protocol).toBe("ss");
    if (node.protocol === "ss") {
      expect(node.credentials.method).toBe("aes-128-gcm");
      expect(node.credentials.password).toBe("37350ee3-8995-4564-915b-38a0b");
      expect(node.plugin?.type).toBe("simple-obfs");
      expect(node.plugin?.options["obfs-host"]).toBe("example.com");
    }
  });

  it("parses SS plain userinfo", () => {
    const parsed = parseSubscription("ss://aes-128-gcm:pass@example.com:8388#Plain", "MF");
    const node = parsed.nodes[0];
    expect(node.protocol).toBe("ss");
    if (node.protocol === "ss") {
      expect(node.credentials.method).toBe("aes-128-gcm");
      expect(node.credentials.password).toBe("pass");
    }
  });

  it("parses SS full base64 body", () => {
    const body = encodeUtf8Base64("aes-128-gcm:pass@example.com:8388");
    const parsed = parseSubscription(`ss://${body}#Full`, "MF");
    const node = parsed.nodes[0];
    expect(node.protocol).toBe("ss");
    if (node.protocol === "ss") {
      expect(node.server).toBe("example.com");
      expect(node.port).toBe(8388);
    }
  });
});
