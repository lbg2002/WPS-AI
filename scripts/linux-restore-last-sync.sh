#!/usr/bin/env bash
# Restore the most recent per-file snapshot created by linux-sync-installed.sh.
set -euo pipefail
root="${LINGXI_INSTALL_DIR:-${HOME}/.lingxi-ai}"
backup_root="$root/source-backups"
[[ -d "$backup_root" ]] || { echo "No source backups found" >&2; exit 1; }
latest="$(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | tail -n 1)"
[[ -n "$latest" ]] || { echo "No backup snapshots found" >&2; exit 1; }
snap="$backup_root/$latest"
echo "Restoring snapshot $snap"
count=0
for host in wps et wpp pdf shared; do
  [[ -d "$snap/$host" ]] || continue
  while IFS= read -r -d '' file; do
    rel="${file#"$snap/$host/"}"
    [[ "$rel" == ".added-files" ]] && continue
    target="$root/plugin-$host/$rel"
    [[ "$host" == "shared" ]] && target="$root/$rel"
    [[ -f "$target" ]] || continue
    cp -p "$file" "$target"
    echo "[RESTORED] $host/$rel"
    count=$((count + 1))
  done < <(find "$snap/$host" -type f -print0)
  if [[ -f "$snap/$host/.added-files" ]]; then
    while IFS= read -r rel; do
      [[ -n "$rel" && "$rel" != /* && "$rel" != *..* ]] || continue
      target="$root/plugin-$host/$rel"
      [[ "$host" == "shared" ]] && target="$root/$rel"
      rm -f "$target"
    done < "$snap/$host/.added-files"
  fi
done
echo "Restart the backend: systemctl --user restart lingxi-ai.service"
echo "Restored $count file(s). Completely restart WPS to see changes."
echo "No user configuration, conversation history or WPS publish.xml was changed."
