#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-models}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

compress_file() {
  local input_path="$1"
  local relative_path="${input_path#./}"
  local temp_path="$TMP_DIR/$(basename "$input_path")"

  npx gltf-transform meshopt "$input_path" "$temp_path" --level high >/dev/null
  mv "$temp_path" "$input_path"
  printf 'compressed %s\n' "$relative_path"
}

while IFS= read -r file; do
  compress_file "$file"
done < <(find "$ROOT_DIR/Posters" "$ROOT_DIR/Panels" -type f -name '*.glb' | sort)
