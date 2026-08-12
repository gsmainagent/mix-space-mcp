import { z } from "zod"
import type { MixSpaceClient } from "../client.js"
import { paginationSchema, errorResult, jsonResult, type ToolResult } from "./posts.js"

export function registerCommentTools(
  server: { tool: (name: string, desc: string, schema: Record<string, z.ZodType>, handler: (args: Record<string, unknown>) => Promise<ToolResult>) => void },
  client: MixSpaceClient,
) {
  server.tool(
    "comment_list",
    "List comments for a specific post or note by its reference ID. Returns paginated comments with reader info.",
    {
      refId: z.string().describe("MongoDB ObjectId of the post/note to get comments for"),
      ...paginationSchema,
    },
    async (args) => {
      try {
        const { refId, ...params } = args
        const data = await client.get(`/api/v2/comments/ref/${refId}`, params)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )
}
