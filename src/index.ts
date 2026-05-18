import type { AdapterFormat, ParsedSubscription } from "./types";
import { getClientAdapter } from "./adapters";
import { parseSubscriptionFromUrl } from "./core/subscription";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, {
    ...init,
    headers: {
      "access-control-allow-origin": "*",
      ...(init.headers ?? {})
    }
  });
}

function textResponse(body: string, contentType: string, init: ResponseInit = {}): Response {
  return new Response(body, {
    ...init,
    headers: {
      "content-type": contentType,
      "access-control-allow-origin": "*",
      ...(init.headers ?? {})
    }
  });
}

function getRequiredParam(url: URL, name: string): string {
  const value = url.searchParams.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required query parameter: ${name}`);
  }
  return value;
}

async function handleParse(requestUrl: URL): Promise<Response> {
  const subscriptionUrl = getRequiredParam(requestUrl, "url");
  const alias = getRequiredParam(requestUrl, "alias");
  const subscription = await parseSubscriptionFromUrl(subscriptionUrl, alias);
  return jsonResponse(subscription);
}

async function handleConvert(requestUrl: URL): Promise<Response> {
  const subscriptionUrl = getRequiredParam(requestUrl, "url");
  const alias = getRequiredParam(requestUrl, "alias");
  const format = (requestUrl.searchParams.get("format") ?? "raw") as AdapterFormat;
  const adapter = getClientAdapter(format);

  if (!adapter) {
    return jsonResponse({ error: `Unsupported format: ${format}` }, { status: 400 });
  }

  const subscription = await parseSubscriptionFromUrl(subscriptionUrl, alias);
  const result = adapter.render(subscription);
  return jsonResponse(result.body, {
    headers: {
      "content-type": result.contentType,
      "x-jax-warnings": JSON.stringify(result.warnings)
    }
  });
}

async function handleRender(request: Request, client: string): Promise<Response> {
  const adapter = getClientAdapter(client);
  if (!adapter) {
    return jsonResponse({ error: `Unsupported render client: ${client}` }, { status: 400 });
  }

  const subscription = (await request.json()) as ParsedSubscription;
  const result = adapter.render(subscription);

  if (typeof result.body === "string") {
    return textResponse(result.body, result.contentType, {
      headers: {
        "x-jax-warnings": JSON.stringify(result.warnings)
      }
    });
  }

  return jsonResponse(result.body, {
    headers: {
      "content-type": result.contentType,
      "x-jax-warnings": JSON.stringify(result.warnings)
    }
  });
}

async function route(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type"
      }
    });
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    return jsonResponse({ ok: true });
  }

  if (request.method === "GET" && requestUrl.pathname === "/parse") {
    return handleParse(requestUrl);
  }

  if (request.method === "GET" && requestUrl.pathname === "/convert") {
    return handleConvert(requestUrl);
  }

  const renderMatch = requestUrl.pathname.match(/^\/render\/([^/]+)$/);
  if (request.method === "POST" && renderMatch) {
    return handleRender(request, renderMatch[1]);
  }

  return jsonResponse({ error: "Not found" }, { status: 404 });
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await route(request);
    } catch (error) {
      return jsonResponse(
        {
          error: error instanceof Error ? error.message : "Internal error"
        },
        { status: 500 }
      );
    }
  }
};
