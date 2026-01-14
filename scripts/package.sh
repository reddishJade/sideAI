#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

mkdir -p "$DIST_DIR"

package_dir() {
  local name="$1"
  local src="$ROOT_DIR/$name"
  local out="$DIST_DIR/${name}.zip"

  if [[ ! -d "$src" ]]; then
    echo "Missing directory: $src" >&2
    exit 1
  fi

  rm -f "$out"
  (cd "$src" && zip -r "$out" .)
  echo "Created $out"
}

package_dir "chrome"
package_dir "firefox"
