import { z } from "zod"
import type { MixSpaceClient } from "../client.js"
import { errorResult, jsonResult, type ToolResult } from "./posts.js"

export function registerCategoryTools(
  server: { tool: (name: string, desc: string, schema: Record<string, z.ZodType>, handler: (args: Record<string, unknown>) => Promise<ToolResult>) => void },
  client: MixSpaceClient,
) {
  server.tool(
    "category_list",
    "List all post categories. Returns category names, slugs, and post counts.",
    {},
    async () => {
      try {
        const data = await client.get("/api/v2/categories")
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "category_get",
    "Get a single category by slug or ID, including its child posts. Can also query tags.",
    {
      query: z.string().describe("Category slug/ID or tag name"),
      tag: z.boolean().optional().describe("If true, treat query as a tag name instead of category"),
    },
    async (args) => {
      try {
        const params: Record<string, unknown> = {}
        if (args.tag) params.tag = "true"
        const data = await client.get(`/api/v2/categories/${args.query}`, params)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )
}
