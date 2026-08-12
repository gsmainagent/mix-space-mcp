import { z } from "zod"
import type { MixSpaceClient } from "../client.js"
import { paginationSchema, errorResult, jsonResult, type ToolResult } from "./posts.js"

export function registerSearchTools(
  server: { tool: (name: string, desc: string, schema: Record<string, z.ZodType>, handler: (args: Record<string, unknown>) => Promise<ToolResult>) => void },
  client: MixSpaceClient,
) {
  server.tool(
    "search_posts",
    "Full-text search across blog posts by keyword. Returns paginated matching posts.",
    {
      ...paginationSchema,
      keyword: z.string().min(1).describe("Search keyword"),
    },
    async (args) => {
      try {
        const data = await client.get("/api/v2/search/post", args)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "search_notes",
    "Full-text search across notes/memos by keyword. Returns paginated matching notes.",
    {
      ...paginationSchema,
      keyword: z.string().min(1).describe("Search keyword"),
    },
    async (args) => {
      try {
        const data = await client.get("/api/v2/search/note", args)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )
}
