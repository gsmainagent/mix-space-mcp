#!/usr/bin/env node
import { loadConfig } from "./config.js"
import { MixSpaceClient } from "./client.js"
import { SERVER_NAME, SERVER_VERSION } from "./mcp.js"
import { startHttpServer } from "./transport/http.js"
import { startStdioServer } from "./transport/stdio.js"

const USAGE = `
${SERVER_NAME} ${SERVER_VERSION} - Mix Space CMS tools for MCP clients

Usage:
  mixspace-mcp [options]

Transport:
  --transport <stdio|http>   Transport to serve (default: http; env MCP_TRANSPORT)
                             stdio: one client over stdin/stdout
                             http:  Streamable HTTP at /mcp + GET /openapi.json
                                    + read-only REST bridge at /api/*

HTTP:
  --port <number>            Listen port (default: 3000; env PORT)
  --host <address>           Bind address (default: 0.0.0.0; env HOST)

Upstream Mix Space API:
  --url <url>                API base URL (default: http://localhost:2323;
                             env MIXSPACE_API_URL)
  --key <key>                API key sent as x-api-key (env MIXSPACE_API_KEY)

Other:
  -h, --help                 Show this help
  -v, --version              Print the version
`

function readFlag(argv: string[], name: string): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === name) {
      return argv[i + 1]
    }
    if (arg.startsWith(`${name}=`)) {
      return arg.slice(name.length + 1)
    }
  }
  return undefined
}

function parsePort(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined
  }
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${raw}`)
  }
  return port
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)

  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE.trim())
    return
  }
  if (argv.includes("--version") || argv.includes("-v")) {
    console.log(SERVER_VERSION)
    return
  }

  const transport = (readFlag(argv, "--transport") ?? process.env.MCP_TRANSPORT ?? "http").toLowerCase()
  if (transport !== "stdio" && transport !== "http") {
    console.error(`Unknown transport "${transport}". Expected "stdio" or "http".`)
    process.exitCode = 2
    return
  }

  // loadConfig only consumes --url/--key; the transport flags above are ignored there.
  const config = loadConfig(argv)
  const client = new MixSpaceClient(config)

  if (transport === "stdio") {
    await startStdioServer(client)
    return
  }

  const port = parsePort(readFlag(argv, "--port") ?? process.env.PORT)
  const host = readFlag(argv, "--host") ?? process.env.HOST ?? "0.0.0.0"
  const running = await startHttpServer(client, {
    host,
    port: port ?? 3000,
  })

  const shutdown = () => {
    void running.close().finally(() => process.exit(0))
    // Do not let a stuck connection keep the process alive forever.
    setTimeout(() => process.exit(0), 5_000).unref()
  }
  process.once("SIGTERM", shutdown)
  process.once("SIGINT", shutdown)
}

main().catch((err) => {
  console.error(`[${SERVER_NAME}] fatal:`, err instanceof Error ? err.message : err)
  process.exit(1)
})
