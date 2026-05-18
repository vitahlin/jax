import type { AdapterResult, ClientAdapter, ParsedSubscription } from "../types";

function makePlaceholderAdapter(format: "clash" | "surge"): ClientAdapter<Record<string, unknown>> {
  return {
    format,
    render(subscription: ParsedSubscription): AdapterResult<Record<string, unknown>> {
      return {
        format,
        contentType: "application/json; charset=utf-8",
        body: {
          version: subscription.version,
          alias: subscription.alias,
          generatedAt: subscription.generatedAt,
          nodes: [],
          warnings: [
            `${format} adapter is registered but not fully implemented in this version`
          ]
        },
        warnings: [
          ...subscription.warnings,
          `${format} adapter is registered but not fully implemented in this version`
        ]
      };
    }
  };
}

export const clashAdapter = makePlaceholderAdapter("clash");
export const surgeAdapter = makePlaceholderAdapter("surge");
