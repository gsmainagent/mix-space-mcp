#!/usr/bin/env bash
# mixspace-mcp down —— 停应用与 frpc
set -euo pipefail
cd "$(dirname "$0")"
docker compose down
echo "--- 残留 ---"
docker compose ps || true
