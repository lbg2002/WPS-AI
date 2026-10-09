#!/usr/bin/env bash
# Incremental Linux source deployment to an existing Lingxi AI installation.
# No .deb rebuild, no apt changes, and no replacement of WPS publish.xml/settings.
# Usage: bash scripts/linux-sync-installed.sh
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_root="$repo_root/plugin"
install_dir="${HOME}/.lingxi-ai"

[[ -f "$plugin_root/js/app.js" ]] || { echo "Missing plugin source" >&2; exit 1; }
[[ -d "$install_dir/plugin-wps" ]] || { echo "Missing installed plugin in $install_dir" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "node is required to regenerate host-specific ribbon files" >&2; exit 1; }

# Save generated source files verbatim. The ribbon generator writes into plugin/,
# so restore the checkout even if an error occurs halfway through.
temp_dir="$(mktemp -d)"
generated=(ribbon.xml ribbon.en.xml js/ribbon-callbacks.generated.js)
restore_generated() {
  for file in "${generated[@]}"; do
    if [[ -f "$temp_dir/$file" ]]; then
      cp "$temp_dir/$file" "$plugin_root/$file"
    fi
  done
  rm -rf "$temp_dir"
}
trap restore_generated EXIT
for file in "${generated[@]}"; do
  [[ -f "$plugin_root/$file" ]] || { echo "Missing $file" >&2; exit 1; }
  mkdir -p "$temp_dir/$(dirname "$file")"
  cp "$plugin_root/$file" "$temp_dir/$file"
done

backup_dir="$install_dir/source-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"

# Only source-controlled files are replaced. The changed HTML/CSS are also synced. Existing credentials, conversations,
# SQLite, publish.xml, user systemd unit, installed runtime and proxy stay intact.
copy_with_backup() {
  local host="$1" file="$2" source="$3"
  local dst="$install_dir/plugin-$host/$file"
  if [[ ! -f "$dst" ]]; then
    if [[ "$file" != "js/selection-quotes.js" ]]; then
      echo "[SKIP] Missing installed file: $dst" >&2
      return
    fi
    mkdir -p "$(dirname "$dst")"
    cp "$source" "$dst"
    echo "[CREATED] $host/$file"
    return
  fi
  mkdir -p "$backup_dir/$host/$(dirname "$file")"
  cp -p "$dst" "$backup_dir/$host/$file"
  cp "$source" "$dst"
  echo "[OK] $host/$file"
}

updated=0
for host in wps et wpp pdf; do
  [[ -d "$install_dir/plugin-$host" ]] || continue
  # Do not use npm run dev: its Linux registration routine overwrites the
  # shared WPS publish.xml and could remove unrelated plugins.
  (cd "$plugin_root" && node tools/gen-ribbon.js "$host")
  copy_with_backup "$host" "main.js" "$plugin_root/main.js"
  copy_with_backup "$host" "js/selection-quotes.js" "$plugin_root/js/selection-quotes.js"
  copy_with_backup "$host" "taskpane.html" "$plugin_root/taskpane.html"
  copy_with_backup "$host" "css/style.css" "$plugin_root/css/style.css"
  copy_with_backup "$host" "js/app.js" "$plugin_root/js/app.js"
  copy_with_backup "$host" "js/wps-addon-adapter.js" "$plugin_root/js/wps-addon-adapter.js"
  copy_with_backup "$host" "js/i18n.js" "$plugin_root/js/i18n.js"
  for file in "${generated[@]}"; do
    copy_with_backup "$host" "$file" "$plugin_root/$file"
  done
  updated=$((updated + 1))
done
echo "Updated $updated installed host(s). Backup: $backup_dir"
echo "Close WPS completely, reopen WPS, then click Lingxi AI > Docked panel."
echo "For a focus/IME problem choose Lingxi AI > Floating dialog."
echo "No .deb rebuild or reinstall is needed."
