import type { ProtocolParser } from "../types";
import { shadowsocksParser } from "./shadowsocks";
import { vlessParser } from "./vless";

export const protocolParsers: ProtocolParser[] = [vlessParser, shadowsocksParser];
