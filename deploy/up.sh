#!/usr/bin/env bash
# mixspace-mcp up —— 起应用 + frpc 隧道
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f frpc/frpc.toml ]]; then
  echo "缺少 frpc/frpc.toml" >&2; exit 1
fi
if ! grep -qE '^FRP_TOKEN=.+' frpc/frpc.env 2>/dev/null; then
  echo "frpc/frpc.env 的 FRP_TOKEN 为空 —— 请先写入 frps 的 auth.token" >&2; exit 1
fi

docker compose up -d --build
echo "--- 状态 ---"
docker compose ps
echo "--- frpc 日志（应出现 login success）---"
docker logs --tail 20 mixspace-mcp-frpc 2>&1 || true
