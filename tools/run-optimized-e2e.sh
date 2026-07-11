#!/usr/bin/env bash
#
# Build a throwaway, off-tree OPTIMIZED + BUNDLED copy of the repo in /tmp, serve
# it with the dev server, and run the full showcase/shop e2e suite against it
# in parallel (--only-errors).
#
# Why: the modular dev build (served straight from lib/ and ui/) never exercises
# optimize.js's opt() transforms or the minifier, so it hides optimizer/bundler
# regressions -- e.g. the class-field ASI bug where a minified `static props={...}`
# gets glued to the next member. This script reproduces the real production build
# path so those regressions fail loudly in CI.
#
# Usage:  ./run-optimized-e2e.sh [PORT]      (script lives in tools/)
# Exit code is non-zero if the build or any e2e suite fails.

set -euo pipefail

# Script lives in tools/, so the repo root is one level up.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${1:-${PORT:-9100}}"
BUILD="$(mktemp -d "${TMPDIR:-/tmp}/vdx-opt-e2e.XXXXXX")"
SERVER_PID=""

cleanup() {
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
    rm -rf "$BUILD"
}
trap cleanup EXIT

echo "==> Optimizing + minifying repo -> $BUILD"
node "$REPO/tools/optimize.js" -i "$REPO" -o "$BUILD" -m -s \
    -x tests,tools,docs,site/embedding

echo "==> Rebuilding + swapping in bundled framework (dist/) for lib/"
( cd "$REPO" && node tools/bundler-esm.js >/dev/null )
for b in framework router utils; do
    cp "$REPO/dist/$b.js" "$BUILD/lib/$b.js"
    cp "$REPO/dist/$b.js.map" "$BUILD/lib/$b.js.map" 2>/dev/null || true
done

# The dev server was excluded from optimization; drop the real one back in.
mkdir -p "$BUILD/tools"
cp "$REPO/tools/test-server.py" "$BUILD/tools/test-server.py"

echo "==> Starting dev server on :$PORT (serving the optimized build)"
sed -i "s/^PORT = .*/PORT = $PORT/" "$BUILD/tools/test-server.py"
( cd "$BUILD" && exec python3 tools/test-server.py >/dev/null 2>&1 ) &
SERVER_PID=$!

for _ in $(seq 1 40); do
    if curl -sf -o /dev/null "http://localhost:$PORT/site/showcase/"; then break; fi
    sleep 0.5
done

echo "==> Running e2e (parallel, --only-errors) against the optimized build"
cd "$REPO/tests/e2e"
E2E_ORIGIN="http://localhost:$PORT" node test-runner.js --only-errors
