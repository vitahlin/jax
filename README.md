# jax

Cloudflare Worker subscription converter for proxy nodes. It parses subscription
URIs into a stable intermediate JSON model, then renders client-specific config.

## Interfaces

- `GET /health`
- `GET /parse?url=<subscriptionUrl>&alias=MF`
- `GET /convert?url=<subscriptionUrl>&alias=MF&format=raw|singbox|singbox-outbounds|clash|surge`
- `POST /render/:client`

## Local CLI

```sh
npm run convert -- --url "https://example.com/sub" --alias MF
npm run convert -- --url "https://example.com/sub" --alias MF --format singbox
```

Raw normalized JSON is written to `data/<alias>.json`. Client configs are written
to `dist/<alias>.<format>.*`.

## Development

Use Node.js 22 or newer for Wrangler/Miniflare.

```sh
npm install
npm test
npm run build
npm run dev
```
