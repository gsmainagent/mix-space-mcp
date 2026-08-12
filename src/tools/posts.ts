import { z } from "zod"
import type { MixSpaceClient } from "../client.js"

export const paginationSchema = {
  page: z.number().int().min(1).optional().describe("Page number (default 1)"),
  size: z.number().int().min(1).max(50).optional().describe("Items per page (default 20, max 50)"),
}

export function errorResult(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string }
    const status = axiosErr.response?.status
    const msg = axiosErr.response?.data?.message ?? axiosErr.message ?? "Unknown error"
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: msg, status }) }],
      isError: true,
    }
  }
  const msg = err instanceof Error ? err.message : String(err)
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  }
}

export function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  }
}

export type ToolResult = ReturnType<typeof jsonResult>

export function registerPostTools(
  server: { tool: (name: string, desc: string, schema: Record<string, z.ZodType>, handler: (args: Record<string, unknown>) => Promise<ToolResult>) => void },
  client: MixSpaceClient,
) {
  server.tool(
    "post_list",
    "List blog posts with pagination, year filter, and sorting. Returns paginated post summaries.",
    {
      ...paginationSchema,
      year: z.number().int().optional().describe("Filter posts by year"),
      sortBy: z.string().optional().describe("Sort field (e.g. created, modified)"),
      sortOrder: z.union([z.literal(1), z.literal(-1)]).optional().describe("Sort direction: 1=asc, -1=desc"),
      truncate: z.number().int().optional().describe("Truncate text content to N characters"),
    },
    async (args) => {
      try {
        const data = await client.get("/api/v2/posts", args)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "post_get",
    "Get a single blog post by its MongoDB ID. Returns full post content with category and related posts.",
    {
      id: z.string().describe("MongoDB ObjectId of the post"),
    },
    async (args) => {
      try {
        const data = await client.get(`/api/v2/posts/${args.id}`)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "post_get_latest",
    "Get the most recently published blog post. Returns full post content.",
    {},
    async () => {
      try {
        const data = await client.get("/api/v2/posts/latest")
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )

  server.tool(
    "post_get_by_slug",
    "Get a blog post by category slug and post slug. Returns full post content.",
    {
      category: z.string().describe("Category slug (e.g. 'tech')"),
      slug: z.string().describe("Post slug (e.g. 'my-first-post')"),
    },
    async (args) => {
      try {
        const data = await client.get(`/api/v2/posts/${args.category}/${args.slug}`)
        return jsonResult(data)
      } catch (e) {
        return errorResult(e)
      }
    },
  )
}
