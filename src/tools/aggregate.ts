import { z } from "zod"
import type { MixSpaceClient } from "../client.js"
import { errorResult, jsonResult, type ToolResult } from "./posts.js"

export function registerAggregateTools(
  server: { tool: (name: string, desc: string, schema: Record<string, z.ZodType>, handler: (args: Record<string, unknown>) => Promise<ToolResult>) => void },
  client: MixSpaceClient,
) {
  server.tool(
    "aggregate_info",
    "Get site-wide aggregate info: owner/user details, SEO config, site URL, categories, and theme settings.",
    {},
    async () => {
      try {
        const data = await client.get("/api/v2/aggregate")
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "aggregate_top",
    "Get top/most popular posts and notes by activity.",
    {
      size: z.number().int().min(1).max(10).optional().describe("Number of top items to return (default varies, max 10)"),
    },
    async (args) => {
      try {
        const data = await client.get("/api/v2/aggregate/top", args)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "aggregate_timeline",
    "Get a chronological timeline of posts and/or notes, optionally filtered by year and type.",
    {
      year: z.number().int().optional().describe("Filter by year"),
      type: z.number().int().min(0).max(1).optional().describe("Content type: 0=posts only, 1=notes only"),
      sort: z.union([z.literal(1), z.literal(-1)]).optional().describe("Sort direction: 1=asc, -1=desc (default 1)"),
    },
    async (args) => {
      try {
        const data = await client.get("/api/v2/aggregate/timeline", args)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )
}
