#!/usr/bin/env bash
# Build a Chrome Web Store-ready zip from the committed HEAD.
#
# Uses `git archive` so the zip contains exactly what's tracked in git
# minus paths marked `export-ignore` in .gitattributes. This guarantees
# node_modules, tests, audits, docs, and local scratch files never ship.
#
# Uncommitted changes are NOT included. Commit first.

set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(node -e "console.log(require('./manifest.json').version)")
OUT_DIR="dist"
OUT_FILE="$OUT_DIR/recall-v${VERSION}.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

git archive --format=zip --output="$OUT_FILE" HEAD

echo "Built $OUT_FILE"
unzip -l "$OUT_FILE" | tail -n +4 | head -n -2 | awk '{print "  "$4}'
