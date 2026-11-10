import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import type { MixSpaceClient } from "../client.js"
import { createMcpServer, SERVER_NAME } from "../mcp.js"
import { buildOpenApiDocument } from "../openapi.js"

export interface HttpServerOptions {
  host: string
  port: number
}

export interface RunningHttpServer {
  server: Server
  close: () => Promise<void>
}

const API_PREFIX = "/api/"
const UPSTREAM_PREFIX = "/api/v2"

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID",
  )
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, Mcp-Session-Id")
}

function sendJson(res: ServerResponse, status: number, body: unknown, extraHeaders?: Record<string, string>): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...extraHeaders,
  })
  res.end(payload)
}

async function handleOpenApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed" }, { Allow: "GET, HEAD, OPTIONS" })
    return
  }
  const doc = buildOpenApiDocument()
  if (req.method === "HEAD") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
    res.end()
    return
  }
  sendJson(res, 200, doc)
}

/**
 * Read-only REST bridge: GET /api/<resource> is forwarded to the upstream
 * Mix Space API as /api/v2/<resource>, preserving query and status code.
 */
async function handleRestProxy(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  client: MixSpaceClient,
): Promise<void> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Read-only bridge: only GET and HEAD are supported" }, {
      Allow: "GET, HEAD, OPTIONS",
    })
    return
  }

  let pathname: string
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    sendJson(res, 400, { error: "Invalid URL encoding" })
    return
  }

  if (pathname.includes("\0") || pathname.split("/").includes("..")) {
    sendJson(res, 400, { error: "Invalid path" })
    return
  }

  const upstreamPath = UPSTREAM_PREFIX + pathname.slice("/api".length)
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = await client.getRaw(upstreamPath, params)

  if (req.method === "HEAD") {
    res.writeHead(result.status, {
      "Content-Type": result.contentType ?? "application/json",
    })
    res.end()
    return
  }

  const isJson = typeof result.data !== "string"
  const body = typeof result.data === "string" ? result.data : JSON.stringify(result.data)
  res.writeHead(result.status, {
    "Content-Type": result.contentType ?? (isJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8"),
    "Content-Length": Buffer.byteLength(body),
  })
  res.end(body)
}

async function handleMcp(req: IncomingMessage, res: ServerResponse, client: MixSpaceClient): Promise<void> {
  // Stateless mode requires a fresh server+transport per request: a transport
  // with sessionIdGenerator=undefined cannot serve a second request.
  const server = createMcpServer(client)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })
  res.on("close", () => {
    void transport.close()
    void server.close()
  })

  try {
    await server.connect(transport)
    await transport.handleRequest(req, res)
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" })
    }
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      }),
    )
    console.error("Error handling MCP request:", err)
  }
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  client: MixSpaceClient,
): Promise<void> {
  setCorsHeaders(res)

  if (req.method === "OPTIONS") {
    res.writeHead(204).end()
    return
  }

  let url: URL
  try {
    url = new URL(req.url ?? "/", "http://localhost")
  } catch {
    sendJson(res, 400, { error: "Invalid request URL" })
    return
  }

  if (url.pathname === "/openapi.json") {
    await handleOpenApi(req, res)
    return
  }

  if (url.pathname === "/api" || url.pathname.startsWith(API_PREFIX)) {
    await handleRestProxy(req, res, url, client)
    return
  }

  await handleMcp(req, res, client)
}

export function startHttpServer(
  client: MixSpaceClient,
  options: HttpServerOptions,
): Promise<RunningHttpServer> {
  const server = createServer((req, res) => {
    void handleRequest(req, res, client)
  })

  return new Promise((resolve, reject) => {
    const onError = (err: Error) => reject(err)
    server.once("error", onError)
    server.listen(options.port, options.host, () => {
      server.off("error", onError)
      console.error(
        `[${SERVER_NAME}] Streamable HTTP on http://${options.host}:${options.port} ` +
          `(MCP: /mcp, OpenAPI: /openapi.json, REST bridge: /api/*)`,
      )
      resolve({
        server,
        close: () =>
          new Promise<void>((done, fail) => {
            server.close((err) => (err ? fail(err) : done()))
          }),
      })
    })
  })
}
