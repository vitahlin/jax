import type { AdapterFormat, ClientAdapter } from "../types";
import { rawAdapter } from "./raw";
import { singboxAdapter, singboxOutboundsAdapter } from "./singbox";
import { clashAdapter, surgeAdapter } from "./placeholders";

export const clientAdapters: Record<AdapterFormat, ClientAdapter> = {
  raw: rawAdapter,
  singbox: singboxAdapter,
  "singbox-outbounds": singboxOutboundsAdapter,
  clash: clashAdapter,
  surge: surgeAdapter
};

export function getClientAdapter(format: string): ClientAdapter | undefined {
  return clientAdapters[format as AdapterFormat];
}
