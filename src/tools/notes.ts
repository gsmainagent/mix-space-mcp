import { z } from "zod"
import type { MixSpaceClient } from "../client.js"
import { paginationSchema, errorResult, jsonResult, type ToolResult } from "./posts.js"

export function registerNoteTools(
  server: { tool: (name: string, desc: string, schema: Record<string, z.ZodType>, handler: (args: Record<string, unknown>) => Promise<ToolResult>) => void },
  client: MixSpaceClient,
) {
  server.tool(
    "note_list",
    "List short notes/memos with pagination and sorting. Notes are shorter than posts, like microblog entries.",
    {
      ...paginationSchema,
      sortBy: z.enum(["title", "created", "modified", "weather", "mood"]).optional().describe("Sort field"),
      sortOrder: z.union([z.literal(1), z.literal(-1)]).optional().describe("Sort direction: 1=asc, -1=desc"),
      withSummary: z.boolean().optional().describe("If true, return AI summary instead of full text"),
    },
    async (args) => {
      try {
        const data = await client.get("/api/v2/notes", args)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )
}
