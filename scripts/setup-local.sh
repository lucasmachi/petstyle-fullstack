#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON_BIN="${PYTHON_BIN:-python3}"
"$PYTHON_BIN" -c 'import sys; assert sys.version_info >= (3, 12), "Use Python 3.12 ou superior"'
"$PYTHON_BIN" -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.lock.txt
if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
(
  cd backend
  .venv/bin/alembic upgrade head
  .venv/bin/python -m app.seed --demo
)
(cd frontend && npm ci)
printf '\nPronto! Em terminais separados: bash scripts/run-api.sh e bash scripts/run-web.sh\n'
