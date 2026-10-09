#!/usr/bin/env bash
# Restore the most recent per-file snapshot created by linux-sync-installed.sh.
set -euo pipefail
root="${HOME}/.lingxi-ai"
backup_root="$root/source-backups"
[[ -d "$backup_root" ]] || { echo "No source backups found" >&2; exit 1; }
latest="$(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | tail -n 1)"
[[ -n "$latest" ]] || { echo "No backup snapshots found" >&2; exit 1; }
snap="$backup_root/$latest"
echo "Restoring snapshot $snap"
count=0
for host in wps et wpp pdf; do
  [[ -d "$snap/$host" ]] || continue
  while IFS= read -r -d '' file; do
    rel="${file#"$snap/$host/"}"
    target="$root/plugin-$host/$rel"
    [[ -f "$target" ]] || continue
    cp -p "$file" "$target"
    echo "[RESTORED] $host/$rel"
    count=$((count + 1))
  done < <(find "$snap/$host" -type f -print0)
done
echo "Restored $count file(s). Completely restart WPS to see changes."
echo "No user configuration, conversation history or WPS publish.xml was changed."
