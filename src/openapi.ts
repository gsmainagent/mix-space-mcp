/**
 * OpenAPI 3.1 description of the read-only REST bridge exposed in HTTP mode.
 *
 * Every path here is a GET passthrough to the upstream Mix Space API
 * (`MIXSPACE_API_URL`) and returns the upstream status code unchanged. The
 * document is generated with placeholders only: it never contains a real
 * blog host, key, or IP.
 */

type JsonObject = Record<string, unknown>

const jsonContent: JsonObject = {
  "application/json": {
    schema: { type: "object", additionalProperties: true },
  },
}

function ok(description: string): JsonObject {
  return { description, content: jsonContent }
}

function errorResponse(description: string): JsonObject {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            status: { type: "integer" },
          },
          additionalProperties: true,
        },
      },
    },
  }
}

const pageParam = { $ref: "#/components/parameters/Page" }
const sizeParam = { $ref: "#/components/parameters/Size" }
const idParam = { $ref: "#/components/parameters/Id" }
const slugParam = { $ref: "#/components/parameters/Slug" }
const categoryParam = { $ref: "#/components/parameters/Category" }
const keywordParam = { $ref: "#/components/parameters/Keyword" }

const notFound = { "404": errorResponse("Upstream resource not found") }
const badGateway = {
  "502": errorResponse("Upstream API is unreachable or returned an invalid response"),
}
const commonResponses = { ...notFound, ...badGateway }

function listOperation(
  tag: string,
  operationId: string,
  summary: string,
  extraParams: JsonObject[] = [],
): JsonObject {
  return {
    tags: [tag],
    operationId,
    summary,
    parameters: [pageParam, sizeParam, ...extraParams],
    responses: { "200": ok("Upstream response body, passed through as-is"), ...commonResponses },
  }
}

function detailOperation(
  tag: string,
  operationId: string,
  summary: string,
  params: JsonObject[],
): JsonObject {
  return {
    tags: [tag],
    operationId,
    summary,
    parameters: params,
    responses: { "200": ok("Upstream response body, passed through as-is"), ...commonResponses },
  }
}

export function buildOpenApiDocument(): JsonObject {
  return {
    openapi: "3.1.0",
    info: {
      title: "Mix Space read-only REST bridge",
      version: "1.0.0",
      description:
        "Read-only GET passthrough to the Mix Space CMS API that this MCP server is configured against. " +
        "Responses and status codes come from the upstream API unchanged. " +
        "The MCP endpoint itself is served over Streamable HTTP at POST /mcp.",
    },
    servers: [
      {
        url: "/",
        description: "This MCP server's own origin (set your deployment URL in the client if needed)",
      },
    ],
    tags: [
      { name: "posts", description: "Blog posts" },
      { name: "notes", description: "Short notes / memos" },
      { name: "pages", description: "Standalone pages" },
      { name: "categories", description: "Categories and tags" },
      { name: "search", description: "Full-text search" },
      { name: "comments", description: "Comments" },
    ],
    paths: {
      "/api/posts": {
        get: listOperation("posts", "listPosts", "List blog posts", [
          {
            name: "year",
            in: "query",
            description: "Filter posts by publication year",
            schema: { type: "integer" },
          },
          {
            name: "sortBy",
            in: "query",
            description: "Sort field (for example created or modified)",
            schema: { type: "string" },
          },
          {
            name: "sortOrder",
            in: "query",
            description: "1 = ascending, -1 = descending",
            schema: { type: "integer", enum: [1, -1] },
          },
          {
            name: "truncate",
            in: "query",
            description: "Truncate text content to N characters",
            schema: { type: "integer" },
          },
        ]),
      },
      "/api/posts/latest": {
        get: detailOperation("posts", "getLatestPost", "Get the most recently published post", []),
      },
      "/api/posts/{id}": {
        get: detailOperation("posts", "getPostById", "Get a post by its document id", [idParam]),
      },
      "/api/posts/{category}/{slug}": {
        get: detailOperation(
          "posts",
          "getPostBySlug",
          "Get a post by category slug and post slug",
          [categoryParam, slugParam],
        ),
      },
      "/api/notes": {
        get: listOperation("notes", "listNotes", "List notes / memos", [
          {
            name: "sortBy",
            in: "query",
            description: "Sort field (for example created or modified)",
            schema: { type: "string" },
          },
          {
            name: "sortOrder",
            in: "query",
            description: "1 = ascending, -1 = descending",
            schema: { type: "integer", enum: [1, -1] },
          },
          {
            name: "withSummary",
            in: "query",
            description: "Return the AI summary instead of full text when available",
            schema: { type: "boolean" },
          },
        ]),
      },
      "/api/notes/{id}": {
        get: detailOperation("notes", "getNoteById", "Get a note by its document id", [idParam]),
      },
      "/api/notes/slug/{slug}": {
        get: detailOperation("notes", "getNoteBySlug", "Get a note by its slug", [slugParam]),
      },
      "/api/pages": {
        get: listOperation("pages", "listPages", "List standalone pages"),
      },
      "/api/pages/{id}": {
        get: detailOperation("pages", "getPageById", "Get a page by its document id", [idParam]),
      },
      "/api/pages/slug/{slug}": {
        get: detailOperation("pages", "getPageBySlug", "Get a page by its slug", [slugParam]),
      },
      "/api/categories": {
        get: detailOperation("categories", "listCategories", "List all post categories", []),
      },
      "/api/categories/{slug}": {
        get: detailOperation(
          "categories",
          "getCategory",
          "Get a category (or a tag) by slug",
          [
            {
              name: "slug",
              in: "path",
              required: true,
              description: "Category slug, or tag name when tag=true",
              schema: { type: "string" },
            },
            {
              name: "tag",
              in: "query",
              description: "Set to true to treat the path value as a tag name",
              schema: { type: "boolean" },
            },
          ],
        ),
      },
      "/api/search/post": {
        get: detailOperation("search", "searchPosts", "Full-text search across posts", [
          keywordParam,
          pageParam,
          sizeParam,
        ]),
      },
      "/api/search/note": {
        get: detailOperation("search", "searchNotes", "Full-text search across notes", [
          keywordParam,
          pageParam,
          sizeParam,
        ]),
      },
      "/api/comments/ref/{refId}": {
        get: detailOperation(
          "comments",
          "listCommentsByRef",
          "List comments attached to a post or note",
          [
            {
              name: "refId",
              in: "path",
              required: true,
              description: "Document id of the post or note the comments belong to",
              schema: { type: "string" },
            },
            pageParam,
            sizeParam,
          ],
        ),
      },
      "/api/comments/{id}": {
        get: detailOperation("comments", "getComment", "Get a single comment by its id", [idParam]),
      },
    },
    components: {
      parameters: {
        Page: {
          name: "page",
          in: "query",
          description: "Page number (default 1)",
          schema: { type: "integer", minimum: 1 },
        },
        Size: {
          name: "size",
          in: "query",
          description: "Items per page (default 20, max 50)",
          schema: { type: "integer", minimum: 1, maximum: 50 },
        },
        Id: {
          name: "id",
          in: "path",
          required: true,
          description: "Document id",
          schema: { type: "string" },
        },
        Slug: {
          name: "slug",
          in: "path",
          required: true,
          description: "Resource slug",
          schema: { type: "string" },
        },
        Category: {
          name: "category",
          in: "path",
          required: true,
          description: "Category slug",
          schema: { type: "string" },
        },
        Keyword: {
          name: "keyword",
          in: "query",
          required: true,
          description: "Search keyword",
          schema: { type: "string", minLength: 1 },
        },
      },
    },
  }
}
