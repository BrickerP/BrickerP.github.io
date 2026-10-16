#!/usr/bin/env bash
# Cloud Agent start phase. Runs detached on every boot and is never awaited,
# so it holds the Vite dev server in the foreground. Output goes to
# /tmp/cursor/start-user/start-user.log; a start-user.status file there means
# the server exited. --strictPort makes a second copy fail instead of quietly
# moving to 5174.
set -euo pipefail
cd "$(dirname "$0")/.."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use default >/dev/null

exec npm run dev -- --strictPort
