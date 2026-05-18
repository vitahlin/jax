import { describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { encodeUtf8Base64 } from "../src/core/base64";

const subscription =
  "vless://00000000-0000-4000-8000-000000000000@example.com:443?type=tcp&security=tls&sni=example.com#VLESS";

describe("worker routes", () => {
  it("handles health checks", async () => {
    const response = await worker.fetch(new Request("https://worker.test/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("parses subscriptions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(encodeUtf8Base64(subscription)))
    );

    const response = await worker.fetch(
      new Request("https://worker.test/parse?url=https%3A%2F%2Fexample.com%2Fsub&alias=MF")
    );
    const body = (await response.json()) as { nodes: Array<{ name: string }> };

    expect(response.status).toBe(200);
    expect(body.nodes).toHaveLength(1);
    expect(body.nodes[0].name).toBe("MF-VLESS");

    vi.unstubAllGlobals();
  });

  it("converts to singbox", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(subscription)));

    const response = await worker.fetch(
      new Request(
        "https://worker.test/convert?url=https%3A%2F%2Fexample.com%2Fsub&alias=MF&format=singbox"
      )
    );
    const body = (await response.json()) as { outbounds: Array<{ tag?: string; type?: string }> };

    expect(response.status).toBe(200);
    expect(body.outbounds[0].tag).toBe("proxy");
    expect(body.outbounds[1].type).toBe("vless");

    vi.unstubAllGlobals();
  });

  it("renders singbox from normalized JSON", async () => {
    const normalized = {
      version: 1,
      alias: "MF",
      generatedAt: "2026-05-16T00:00:00.000Z",
      source: { type: "subscription" },
      nodes: [
        {
          id: "1",
          name: "MF-SS",
          originalName: "SS",
          protocol: "ss",
          server: "example.org",
          port: 8388,
          credentials: { method: "aes-128-gcm", password: "pass" },
          raw: { uri: "ss://example", query: {} },
          warnings: []
        }
      ],
      unsupported: [],
      warnings: []
    };

    const response = await worker.fetch(
      new Request("https://worker.test/render/singbox", {
        method: "POST",
        body: JSON.stringify(normalized)
      })
    );
    const body = (await response.json()) as { outbounds: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(body.outbounds[1]).toMatchObject({
      type: "shadowsocks",
      tag: "MF-SS"
    });
  });
});
