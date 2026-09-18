#!/usr/bin/env node
import { createServer } from "node:http"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { loadConfig } from "./config.js"
import { MixSpaceClient } from "./client.js"
import { registerPostTools } from "./tools/posts.js"
import { registerNoteTools } from "./tools/notes.js"
import { registerPageTools } from "./tools/pages.js"
import { registerCategoryTools } from "./tools/categories.js"
import { registerSearchTools } from "./tools/search.js"
import { registerAggregateTools } from "./tools/aggregate.js"
import { registerCommentTools } from "./tools/comments.js"
import { registerMiscTools } from "./tools/misc.js"

const config = loadConfig(process.argv.slice(2))
const client = new MixSpaceClient(config)

// Stateless mode requires a fresh server+transport per request: a transport with
// sessionIdGenerator=undefined cannot serve a second request (SDK >=1.2x).
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mixspace-mcp",
    version: "1.0.0",
  })

  registerPostTools(server, client)
  registerNoteTools(server, client)
  registerPageTools(server, client)
  registerCategoryTools(server, client)
  registerSearchTools(server, client)
  registerAggregateTools(server, client)
  registerCommentTools(server, client)
  registerMiscTools(server, client)

  return server
}

const httpServer = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID"
  )
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, Mcp-Session-Id")

  if (req.method === "OPTIONS") {
    res.writeHead(204).end()
    return
  }

  const server = createMcpServer()
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
      })
    )
    console.error("Error handling MCP request:", err)
  }
})

const port = Number(process.env.PORT ?? 3000)
httpServer.listen(port, () => {
  console.error(`mixspace-mcp (Streamable HTTP) listening on port ${port}`)
})
