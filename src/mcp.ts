import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { MixSpaceClient } from "./client.js"
import { registerPostTools } from "./tools/posts.js"
import { registerNoteTools } from "./tools/notes.js"
import { registerPageTools } from "./tools/pages.js"
import { registerCategoryTools } from "./tools/categories.js"
import { registerSearchTools } from "./tools/search.js"
import { registerAggregateTools } from "./tools/aggregate.js"
import { registerCommentTools } from "./tools/comments.js"
import { registerMiscTools } from "./tools/misc.js"

export const SERVER_NAME = "mixspace-mcp"
export const SERVER_VERSION = "1.0.0"

/**
 * Build a fully wired MCP server. Transports create one of these per
 * connection (stdio) or per request (stateless HTTP); tools are registered
 * through the same registrars either way.
 */
export function createMcpServer(client: MixSpaceClient): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
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
