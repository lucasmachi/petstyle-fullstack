#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
RUNTIME_DIR="$ROOT/.petstyle-runtime"
API_PID_FILE="$RUNTIME_DIR/api.pid"
WEB_PID_FILE="$RUNTIME_DIR/web.pid"
WEB_PORT="${PETSTYLE_WEB_PORT:-5173}"
API_PORT="${PETSTYLE_API_PORT:-8000}"

die() {
  printf '\nErro: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  for pid_file in "$WEB_PID_FILE" "$API_PID_FILE"; do
    if [ -f "$pid_file" ]; then
      pid="$(cat "$pid_file")"
      kill "$pid" 2>/dev/null || true
    fi
  done
  rm -rf "$RUNTIME_DIR"
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

cd "$ROOT"
command -v "$PYTHON_BIN" >/dev/null 2>&1 || die "Python não encontrado. Instale o Python 3.12 ou superior."
command -v node >/dev/null 2>&1 || die "Node.js não encontrado. Instale o Node.js 20 ou superior."
command -v npm >/dev/null 2>&1 || die "npm não encontrado. Instale o Node.js com npm."

"$PYTHON_BIN" -c 'import sys; assert sys.version_info >= (3, 12), "Use Python 3.12 ou superior"' \
  || die "A versão do Python precisa ser 3.12 ou superior."
node -e 'const major = Number(process.versions.node.split(".")[0]); if (major < 20) process.exit(1)' \
  || die "A versão do Node.js precisa ser 20 ou superior."

port_available() {
  "$PYTHON_BIN" - "$1" <<'PY'
import socket
import sys

with socket.socket() as sock:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(("127.0.0.1", int(sys.argv[1])))
    except OSError:
        raise SystemExit(1)
PY
}

if ! port_available "$API_PORT" || ! port_available "$WEB_PORT"; then
  if [ -z "${PETSTYLE_API_PORT:-}" ] && [ -z "${PETSTYLE_WEB_PORT:-}" ] \
    && port_available 18000 && port_available 15173; then
    API_PORT=18000
    WEB_PORT=15173
    printf 'As portas padrão estão ocupadas; usando API %s e site %s.\n' "$API_PORT" "$WEB_PORT"
  else
    die "As portas $API_PORT e/ou $WEB_PORT estão ocupadas. Pare o processo que as usa ou defina PETSTYLE_API_PORT e PETSTYLE_WEB_PORT."
  fi
fi

if [ ! -x "$ROOT/backend/.venv/bin/python" ]; then
  printf 'Criando ambiente Python...\n'
  "$PYTHON_BIN" -m venv "$ROOT/backend/.venv"
fi

if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  printf 'Criado backend/.env a partir do exemplo.\n'
fi

if [ ! -f "$ROOT/backend/.venv/.petstyle-deps-installed" ]; then
  printf 'Instalando dependências Python...\n'
  "$ROOT/backend/.venv/bin/python" -m pip install --disable-pip-version-check -q -r "$ROOT/backend/requirements.lock.txt"
  touch "$ROOT/backend/.venv/.petstyle-deps-installed"
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  printf 'Instalando dependências do frontend...\n'
  (cd "$ROOT/frontend" && npm ci --silent)
fi

printf 'Preparando banco SQLite e dados de demonstração...\n'
(
  cd "$ROOT/backend"
  .venv/bin/alembic upgrade head
  .venv/bin/python -m app.seed --demo
)

mkdir -p "$RUNTIME_DIR"
printf 'Iniciando API e frontend...\n'
(
  cd "$ROOT/backend"
  ALLOWED_ORIGINS="http://localhost:$WEB_PORT,http://127.0.0.1:$WEB_PORT,http://localhost:$API_PORT,http://127.0.0.1:$API_PORT" \
    exec .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port "$API_PORT"
) >"$RUNTIME_DIR/api.log" 2>&1 &
printf '%s\n' "$!" >"$API_PID_FILE"

(
  cd "$ROOT/frontend"
  API_PROXY_TARGET="http://127.0.0.1:$API_PORT" exec npm run dev -- --host 127.0.0.1 --port "$WEB_PORT"
) >"$RUNTIME_DIR/web.log" 2>&1 &
printf '%s\n' "$!" >"$WEB_PID_FILE"

ready() {
  "$ROOT/backend/.venv/bin/python" - "$1" <<'PY'
import sys
import urllib.request

try:
    with urllib.request.urlopen(sys.argv[1], timeout=1) as response:
        raise SystemExit(0 if response.status < 500 else 1)
except Exception:
    raise SystemExit(1)
PY
}

for _ in $(seq 1 30); do
  if ready "http://127.0.0.1:$API_PORT/api/health" && ready "http://127.0.0.1:$WEB_PORT"; then
    break
  fi
  sleep 1
done

if ! ready "http://127.0.0.1:$API_PORT/api/health"; then
  cat "$RUNTIME_DIR/api.log" >&2
  die "A API não iniciou."
fi
if ! ready "http://127.0.0.1:$WEB_PORT"; then
  cat "$RUNTIME_DIR/web.log" >&2
  die "O frontend não iniciou."
fi

printf '\nPet Style está rodando.\nSite: http://127.0.0.1:%s\nAPI:  http://127.0.0.1:%s/docs\n\nUse os botões "Demo: tutor" e "Demo: equipe" na tela de login.\nPressione Ctrl+C para encerrar os dois processos.\n' "$WEB_PORT" "$API_PORT"

while kill -0 "$(cat "$API_PID_FILE")" 2>/dev/null && kill -0 "$(cat "$WEB_PID_FILE")" 2>/dev/null; do
  sleep 1
done

printf '\nUm dos processos foi encerrado. Logs:\n'
printf '%s\n' "$RUNTIME_DIR/api.log" "$RUNTIME_DIR/web.log"
exit 1
