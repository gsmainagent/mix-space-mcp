import { z } from "zod"
import type { MixSpaceClient } from "../client.js"
import { errorResult, jsonResult, type ToolResult } from "./posts.js"

export function registerMiscTools(
  server: { tool: (name: string, desc: string, schema: Record<string, z.ZodType>, handler: (args: Record<string, unknown>) => Promise<ToolResult>) => void },
  client: MixSpaceClient,
) {
  server.tool(
    "rss_feed",
    "Get the site's RSS/Atom feed data as structured JSON. Contains recent posts and notes in feed format.",
    {},
    async () => {
      try {
        const data = await client.get("/api/v2/aggregate/feed")
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "friend_list",
    "List all approved friend links (blogroll). Returns site names, URLs, avatars, and descriptions.",
    {},
    async () => {
      try {
        const data = await client.get("/api/v2/friends/all")
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "say_random",
    "Get a random 'say' (short quote or aphorism) from the site's collection.",
    {},
    async () => {
      try {
        const data = await client.get("/api/v2/says/random")
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "recently_list",
    "List recent 'recently' items (short status updates / life moments). Returns all items.",
    {},
    async () => {
      try {
        const data = await client.get("/api/v2/recently/all")
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )
}
