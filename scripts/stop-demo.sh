#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT/.petstyle-runtime"

if [ ! -d "$RUNTIME_DIR" ]; then
  printf 'O modo demo não está rodando.\n'
  exit 0
fi

for pid_file in "$RUNTIME_DIR/web.pid" "$RUNTIME_DIR/api.pid"; do
  if [ -f "$pid_file" ]; then
    kill "$(cat "$pid_file")" 2>/dev/null || true
  fi
done
rm -rf "$RUNTIME_DIR"
printf 'Pet Style encerrado. O banco backend/petstyle.db foi preservado.\n'
