#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../frontend"
exec npm run dev -- --host 127.0.0.1
