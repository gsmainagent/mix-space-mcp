import { createServer } from "node:http"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"

// 官方 stateless 参考实现：每请求新建 server+transport
function makeServer() {
  const s = new McpServer({ name: "t", version: "1.0.0" })
  s.tool("hello", "test tool", {}, async () => ({ content: [{ type: "text", text: "ok" }] }))
  return s
}
createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return }
  const server = makeServer()
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on("close", () => { transport.close(); server.close() })
  try {
    await server.connect(transport)
    await transport.handleRequest(req, res)
  } catch (e) {
    console.error("ERR:", e?.message)
    if (!res.headersSent) res.writeHead(500, {"Content-Type":"application/json"})
    res.end(JSON.stringify({error: String(e?.message)}))
  }
}).listen(3115, () => console.error("stateless test on 3115"))
