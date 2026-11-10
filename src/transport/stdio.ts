import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import type { MixSpaceClient } from "../client.js"
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from "../mcp.js"

/**
 * Serve MCP over stdio. stdout is reserved for JSON-RPC frames, so every
 * diagnostic goes to stderr.
 */
export async function startStdioServer(client: MixSpaceClient): Promise<void> {
  const server = createMcpServer(client)
  const transport = new StdioServerTransport()

  transport.onerror = (error) => {
    console.error(`[${SERVER_NAME}] transport error:`, error)
  }

  await server.connect(transport)
  console.error(`[${SERVER_NAME}] ${SERVER_VERSION} listening on stdio`)
}
