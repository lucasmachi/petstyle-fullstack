#!/bin/sh
set -eu
python -m app.wait_for_db
alembic upgrade head
if [ "${DEMO_MODE:-false}" = "true" ]; then
  python -m app.seed --demo
else
  python -m app.seed
fi
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-proxy-headers
