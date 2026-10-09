#!/usr/bin/env bash
# Apply local source edits to an existing Linux Lingxi AI installation without rebuilding a .deb.
# Usage: bash scripts/linux-sync-installed.sh
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_file="$repo_root/plugin/js/app.js"
install_dir="${HOME}/.lingxi-ai"
[[ -f "$source_file" ]] || { echo "Missing source: $source_file" >&2; exit 1; }
[[ -d "$install_dir/plugin-wps" ]] || { echo "No existing Lingxi AI user installation at $install_dir" >&2; exit 1; }
backup_dir="$install_dir/source-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
updated=0
for host in wps et wpp pdf; do
  target="$install_dir/plugin-$host/js/app.js"
  [[ -f "$target" ]] || continue
  mkdir -p "$backup_dir/$host"
  cp -p "$target" "$backup_dir/$host/app.js"
  cp "$source_file" "$target"
  echo "[OK] $host: updated $target"
  updated=$((updated + 1))
done
echo "Updated $updated host(s). Previous files: $backup_dir"
echo "Completely exit WPS and restart it, then reopen Lingxi AI."
echo "This does not modify /opt/lingxi-ai or apt's package-managed files."
