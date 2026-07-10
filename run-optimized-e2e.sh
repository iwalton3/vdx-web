#!/usr/bin/env bash
#
# Build a throwaway, off-tree OPTIMIZED + BUNDLED copy of the app in /tmp, serve
# it with the dev server, and run the full componentlib/shop e2e suite against it
# in parallel (--only-errors).
#
# Why: the modular dev build (served straight from app/lib and app/componentlib)
# never exercises optimize.js's opt() transforms or the minifier, so it hides
# optimizer/bundler regressions -- e.g. the class-field ASI bug where a minified
# `static props={...}` gets glued to the next member. This script reproduces the
# real production build path so those regressions fail loudly in CI.
#
# Usage:  ./run-optimized-e2e.sh [PORT]
# Exit code is non-zero if the build or any e2e suite fails.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-${PORT:-9100}}"
BUILD="$(mktemp -d "${TMPDIR:-/tmp}/vdx-opt-e2e.XXXXXX")"
SERVER_PID=""

cleanup() {
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
    rm -rf "$BUILD"
}
trap cleanup EXIT

echo "==> Optimizing + minifying app -> $BUILD"
node "$REPO/optimize.js" -i "$REPO/app" -o "$BUILD" -m -s \
    -x tests,benchmarks,bundle-demo,apps/music/vendor

echo "==> Rebuilding + swapping in bundled framework (dist/) for lib/"
( cd "$REPO" && node bundler-esm.js >/dev/null )
for b in framework router utils; do
    cp "$REPO/app/dist/$b.js" "$BUILD/lib/$b.js"
    cp "$REPO/app/dist/$b.js.map" "$BUILD/lib/$b.js.map" 2>/dev/null || true
done

echo "==> Starting dev server on :$PORT (serving the optimized build)"
sed -i "s/^PORT = .*/PORT = $PORT/" "$BUILD/test-server.py"
( cd "$BUILD" && exec python3 test-server.py >/dev/null 2>&1 ) &
SERVER_PID=$!

for _ in $(seq 1 40); do
    if curl -sf -o /dev/null "http://localhost:$PORT/componentlib/"; then break; fi
    sleep 0.5
done

echo "==> Running e2e (parallel, --only-errors) against the optimized build"
cd "$REPO/componentlib-e2e"
E2E_ORIGIN="http://localhost:$PORT" node test-runner.js --only-errors
