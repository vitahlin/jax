import type { AdapterResult, ClientAdapter, ParsedSubscription } from "../types";

export const rawAdapter: ClientAdapter<ParsedSubscription> = {
  format: "raw",
  render(subscription: ParsedSubscription): AdapterResult<ParsedSubscription> {
    return {
      format: "raw",
      contentType: "application/json; charset=utf-8",
      body: subscription,
      warnings: subscription.warnings
    };
  }
};
