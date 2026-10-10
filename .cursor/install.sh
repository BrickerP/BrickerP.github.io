#!/usr/bin/env bash
# Cloud Agent install phase. Runs once per environment build, before the
# snapshot. It must be idempotent and must exit.
set -euo pipefail
cd "$(dirname "$0")/.."

# Node comes from .node-version, the same file CI reads. nvm is already loaded
# in this image's login shells and its bin precedes /usr/local/bin, so it is
# the version manager that actually decides what `node` resolves to here.
want="$(tr -d '[:space:]' < .node-version)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
if [ "$(node -v 2>/dev/null || true)" != "v$want" ]; then
  nvm install "$want"
fi
nvm alias default "$want" >/dev/null
nvm use "$want" >/dev/null

npm ci

# The browser QA scripts (verify:browser, verify:seam, verify:performance)
# launch Playwright's Chromium. Install it with its system libraries so an
# agent can run them without a second download. Skips when already present.
npx playwright install --with-deps chromium

node -v
npm -v
