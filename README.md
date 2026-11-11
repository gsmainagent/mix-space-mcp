# mixspace-mcp

把 [Mix Space](https://github.com/mix-space/core) CMS 的只读 REST API 包装成 MCP 工具，供 LLM 客户端（OpenClaw、Claude Desktop 等）调用。同一份进程还提供两种传输：

- **stdio**：MCP 客户端直接拉起子进程，走 stdin/stdout JSON-RPC。
- **HTTP（默认）**：Streamable HTTP MCP 端点 `/mcp`，外加 `GET /openapi.json` 与只读 REST 透传 `/api/*`（给 OpenWebUI 这类只认 OpenAPI 的客户端用）。

> 所有示例里的域名、密钥均为占位符。实际部署时替换为你的博客 API 地址与密钥，不要提交进仓库。

## 功能

- 覆盖文章、笔记、页面、分类、搜索、评论、聚合信息、友链、RSS、随机说说等只读工具。
- 工具内部按 `/api/v2` 前缀调用；配置成裸域名或已带 `/api/v2` 的地址都能自适应。
- HTTP 模式的 `/api/*` 是**逐字透传**：状态码与响应体原样返回，不做二次包装。
- 无写操作：REST 桥只接受 `GET` / `HEAD`。

## 安装

要求 Node.js >= 20。

### 方式一：npx 直接从 git 运行（免安装）

```bash
MIXSPACE_API_URL=https://YOUR-BLOG-API \
MIXSPACE_API_KEY=YOUR-API-KEY \
npx -y github:gsmainagent/mix-space-mcp#master --transport stdio
```

首次运行会从 git 拉取并执行 `prepare` 构建 `dist/`（需要能装 devDependencies，属正常现象）。

> ⚠️ 本仓库现为 **public**，公开拉取无需凭据。但若仓库转回 **private**，`npx` 走 git 取包就需要本机先有该 GitHub 账号的 git 凭据（`gh auth login` 写 credential helper，或配好 SSH key）。没有凭据时 `npx` 会**静默失败**——不打印任何错误，只以退出码 128 结束，看起来就像「什么都没发生」。
> 自查：`npx -y github:gsmainagent/mix-space-mcp#master --help; echo $?`，若输出 `128` 就是凭据问题，改用方式二或先修凭据。
> 另注：`npx` 按 spec 字符串缓存安装结果，同一 `#master` 不会因上游有新提交而重新拉取；要拿最新提交先 `rm -rf ~/.npm/_npx`（或改用带 commit 的 spec）。

### 方式二：本地构建

```bash
git clone https://github.com/gsmainagent/mix-space-mcp.git
cd mixspace-mcp
npm ci
npm run build
node dist/cli.js --transport stdio
```

### 方式三：Docker

```bash
docker build -t mixspace-mcp:latest .

docker run -d --name mixspace-mcp --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -e MIXSPACE_API_URL=https://YOUR-BLOG-API \
  -e MIXSPACE_API_KEY=YOUR-API-KEY \
  mixspace-mcp:latest
```

镜像为多阶段构建，运行层只保留 `dist/` 与生产依赖，以非 root 的 `node` 用户运行。容器内默认 `PORT=3000`、`HOST=0.0.0.0`。

## 传输配置

### stdio（MCP 客户端拉起进程）

Claude Desktop / 通用 `mcpServers` 配置：

```json
{
  "mcpServers": {
    "mixspace": {
      "command": "npx",
      "args": [
        "-y",
        "github:gsmainagent/mix-space-mcp#master",
        "--transport",
        "stdio"
      ],
      "env": {
        "MIXSPACE_API_URL": "https://YOUR-BLOG-API",
        "MIXSPACE_API_KEY": "YOUR-API-KEY"
      }
    }
  }
}
```

OpenClaw：

```json
{
  "mcpServers": {
    "mixspace": {
      "transport": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mixspace-mcp/dist/cli.js", "--transport", "stdio"],
      "env": {
        "MIXSPACE_API_URL": "https://YOUR-BLOG-API",
        "MIXSPACE_API_KEY": "YOUR-API-KEY"
      }
    }
  }
}
```

### HTTP（Streamable HTTP，默认）

```bash
node dist/cli.js --transport http --port 3000 --host 0.0.0.0
```

MCP 客户端连接地址：`http://YOUR-MCP-HOST:3000/mcp`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/mcp` | MCP Streamable HTTP（无状态，每个请求独立） |
| GET / HEAD | `/openapi.json` | 只读 REST 桥的 OpenAPI 3.1 描述 |
| GET / HEAD | `/api/*` | 透传到上游 `MIXSPACE_API_URL` 的 `/api/v2/*` |
| OPTIONS | 任意 | CORS 预检 |

MCP 默认托管在除 `/openapi.json`、`/api/*` 以外的所有路径上（根路径 `/` 也可作为 MCP 端点），兼容旧部署。

### 只读 REST 透传路径

以下路径由 `GET /openapi.json` 完整描述，响应与状态码均来自上游：

| 路径 | 说明 |
| --- | --- |
| `/api/posts` | 文章列表（`page`、`size`、`year`、`sortBy`、`sortOrder`、`truncate`） |
| `/api/posts/latest` | 最新文章 |
| `/api/posts/{id}` | 按文档 id 取文章 |
| `/api/posts/{category}/{slug}` | 按分类 slug + 文章 slug 取文章 |
| `/api/notes` | 笔记列表 |
| `/api/notes/{id}` | 按文档 id 取笔记 |
| `/api/notes/slug/{slug}` | 按 slug 取笔记 |
| `/api/pages` | 页面列表 |
| `/api/pages/{id}` | 按文档 id 取页面 |
| `/api/pages/slug/{slug}` | 按 slug 取页面 |
| `/api/categories` | 分类列表 |
| `/api/categories/{slug}` | 分类/标签详情（`tag=true` 时按标签查询） |
| `/api/search/post` | 文章搜索（`keyword` 必填） |
| `/api/search/note` | 笔记搜索（`keyword` 必填） |
| `/api/comments/ref/{refId}` | 某篇文章/笔记的评论列表 |
| `/api/comments/{id}` | 单条评论详情 |

除上述文档化路径外，任意 `GET /api/<...>` 也会被转发到上游 `/api/v2/<...>`（只读桥不做路径白名单）；写方法与 `OPTIONS` 之外的请求一律拒绝或忽略。

## OpenWebUI 接入

1. 以 HTTP 模式启动（Docker 或 `node dist/cli.js`）。
2. OpenWebUI → 设置 → 工具 / OpenAPI 工具服务器，填入：
   `http://YOUR-MCP-HOST:3000/openapi.json`
3. 如果 OpenWebUI 需要覆盖 base URL，填表达式对应的服务地址：
   `http://YOUR-MCP-HOST:3000`

OpenAPI 里只描述只读路径：文章列表/详情/最新、笔记列表/详情、页面列表/详情、分类、搜索、评论。所有请求由本服务转发到配置好的上游，密钥不会暴露给浏览器。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MIXSPACE_API_URL` | `http://localhost:2323` | Mix Space API 地址；裸域名或带 `/api/vN` 均可 |
| `MIXSPACE_API_KEY` | 空 | 作为 `x-api-key` 发送给上游 |
| `MCP_TRANSPORT` | `http` | `stdio` 或 `http` |
| `PORT` | `3000` | HTTP 监听端口 |
| `HOST` | `0.0.0.0` | HTTP 绑定地址；本机使用可改为 `127.0.0.1` |

## 命令行参数

| 参数 | 说明 |
| --- | --- |
| `--transport <stdio\|http>` | 传输方式，默认 `http` |
| `--port <number>` | HTTP 端口，默认 `3000` |
| `--host <address>` | HTTP 绑定地址，默认 `0.0.0.0` |
| `--url <url>` | 上游 API 地址（覆盖 `MIXSPACE_API_URL`） |
| `--key <key>` | 上游 API 密钥（覆盖 `MIXSPACE_API_KEY`） |
| `-h`, `--help` | 显示帮助 |
| `-v`, `--version` | 显示版本 |

## 开发

```bash
npm ci
npm run typecheck
npm run build
node dist/cli.js --transport http
```

## 安全提示

- HTTP 模式的 `/api/*` 桥把配置中 API 密钥对应的上游 GET 能力暴露给调用方。默认镜像绑定 `0.0.0.0` 是为了容器可达；**请只绑定 loopback，或在反向代理后面加鉴权**，不要直接把无鉴权实例暴露到公网。
- 本服务不提供任何写操作，也不保存业务数据。
