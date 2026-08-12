#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
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

const transport = new StdioServerTransport()
await server.connect(transport)
