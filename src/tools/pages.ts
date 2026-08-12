import { z } from "zod"
import type { MixSpaceClient } from "../client.js"
import { paginationSchema, errorResult, jsonResult, type ToolResult } from "./posts.js"

export function registerPageTools(
  server: { tool: (name: string, desc: string, schema: Record<string, z.ZodType>, handler: (args: Record<string, unknown>) => Promise<ToolResult>) => void },
  client: MixSpaceClient,
) {
  server.tool(
    "page_list",
    "List standalone pages (e.g. About, Links) with pagination.",
    {
      ...paginationSchema,
    },
    async (args) => {
      try {
        const data = await client.get("/api/v2/pages", args)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "page_get_by_slug",
    "Get a standalone page by its slug. Returns full page content.",
    {
      slug: z.string().describe("Page slug (e.g. 'about')"),
    },
    async (args) => {
      try {
        const data = await client.get(`/api/v2/pages/slug/${args.slug}`)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )
}
